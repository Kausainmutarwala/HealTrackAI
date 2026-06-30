from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from pydantic import BaseModel

from database.mongodb import patients_collection
from models.symptom import SymptomCreate
from utils.security import get_current_user, require_role
from ml.predict import predict_recovery
from ml.risk_engine import classify_risk

router = APIRouter(prefix="/patients", tags=["patients"])


class MedicineCreate(BaseModel):
    name: str
    time: str


def serialize_patient(doc: dict) -> dict:
    doc["id"] = str(doc["_id"])
    doc.pop("_id", None)
    return doc


def _maybe_save_weekly_snapshot(doc: dict, recovery_percent: float, risk: dict) -> dict | None:
    """Returns a new weekly snapshot if enough time has passed since the last one."""
    snapshots = doc.get("weekly_snapshots", [])
    now = datetime.now(timezone.utc)

    if snapshots:
        last = datetime.fromisoformat(snapshots[-1]["recorded_at"])
        days_since = (now - last).days
        if days_since < 0.001:
            return None  # too soon

    week_num = len(snapshots) + 1
    return {
        "week": week_num,
        "recovery_percent": recovery_percent,
        "risk_level": risk["risk_level"],
        "adherence": doc.get("medicine_adherence", 0.0),
        "symptom_count": len(doc.get("symptoms", [])),
        "recorded_at": now.isoformat(),
    }


@router.get("/me")
async def get_my_profile(user: dict = Depends(get_current_user)):
    doc = await patients_collection().find_one({"user_id": user["sub"]})
    if not doc:
        return {
            "id": None,
            "name": user.get("name", "Patient"),
            "age": 0,
            "recovery_percent": 50,
            "risk_level": "Low",
            "risk_note": "No data yet.",
            "symptoms": [],
            "medicines": [],
            "recovery_history": [],
            "symptom_history": [],
            "weekly_snapshots": [],
        }
    return serialize_patient(doc)


@router.get("")
async def list_patients(user: dict = Depends(require_role("Doctor"))):
    patients = patients_collection()
    docs = await patients.find().to_list(length=500)
    return [serialize_patient(d) for d in docs]


@router.get("/{patient_id}")
async def get_patient(patient_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(patient_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient id.")
    doc = await patients_collection().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found.")
    return serialize_patient(doc)


@router.post("/{patient_id}/symptoms")
async def log_symptom(patient_id: str, payload: SymptomCreate, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(patient_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient id.")

    patients = patients_collection()
    doc = await patients.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found.")

    now = datetime.now(timezone.utc)
    entry = {
        "label": payload.label,
        "severity": payload.severity,
        "logged_at": now.isoformat(),
    }

    severity_weight = {"None": 0, "Mild": 3, "Moderate": 6, "Severe": 9}
    existing_symptoms = doc.get("symptoms", [])
    recent_symptoms = (existing_symptoms + [entry])[-5:]
    recent_scores = [severity_weight.get(s["severity"], 3) for s in recent_symptoms]
    new_symptom_score = round(sum(recent_scores) / len(recent_scores), 2)

    recovery_percent = predict_recovery(
        age=doc["age"],
        symptom_score=new_symptom_score,
        medicine_adherence=doc.get("medicine_adherence", 0.5),
    )
    risk = classify_risk(
        age=doc["age"],
        symptom_score=new_symptom_score,
        medicine_adherence=doc.get("medicine_adherence", 0.5),
    )

    # Use a unique, sortable label (HH:MM:SS) so the chart never collides
    # two points logged within the same minute.
    day_label = now.strftime('%H:%M:%S')
    recovery_point = {"day": day_label, "value": recovery_percent}
    symptom_point = {"day": day_label, "value": new_symptom_score}

    # Weekly snapshot check
    snapshot = _maybe_save_weekly_snapshot(doc, recovery_percent, risk)
    push_fields = {
        "symptoms": entry,
        "recovery_history": {"$each": [recovery_point], "$slice": -7},
        "symptom_history": {"$each": [symptom_point], "$slice": -7},
    }
    if snapshot:
        push_fields["weekly_snapshots"] = snapshot

    await patients.update_one(
        {"_id": oid},
        {
            "$push": push_fields,
            "$set": {
                "symptom_score": new_symptom_score,
                "recovery_percent": recovery_percent,
                "risk_level": risk["risk_level"],
                "risk_note": risk["note"],
            },
        },
    )

    updated = await patients.find_one({"_id": oid})
    return {
        "symptom": entry,
        "symptoms": updated.get("symptoms", []),
        "recovery_percent": recovery_percent,
        "risk_level": risk["risk_level"],
        "risk_note": risk["note"],
        "weekly_snapshots": updated.get("weekly_snapshots", []),
    }


@router.post("/{patient_id}/medicines")
async def add_medicine(patient_id: str, payload: MedicineCreate, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(patient_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient id.")
    patients = patients_collection()
    doc = await patients.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found.")
    new_medicine = {"name": payload.name, "time": payload.time, "taken": False}
    await patients.update_one({"_id": oid}, {"$push": {"medicines": new_medicine}})
    updated = await patients.find_one({"_id": oid})
    return {"medicines": updated.get("medicines", [])}


@router.post("/{patient_id}/medicines/{index}/toggle")
async def toggle_medicine(patient_id: str, index: int, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(patient_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient id.")
    patients = patients_collection()
    doc = await patients.find_one({"_id": oid})
    if not doc or index >= len(doc.get("medicines", [])):
        raise HTTPException(status_code=404, detail="Medicine entry not found.")
    medicines = doc["medicines"]
    medicines[index]["taken"] = not medicines[index]["taken"]
    taken_ratio = sum(1 for m in medicines if m["taken"]) / max(len(medicines), 1)
    await patients.update_one({"_id": oid}, {"$set": {"medicines": medicines, "medicine_adherence": round(taken_ratio, 2)}})
    return {"medicines": medicines, "medicine_adherence": round(taken_ratio, 2)}


@router.delete("/{patient_id}/symptoms/{index}")
async def delete_symptom(patient_id: str, index: int, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(patient_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient id.")
    patients = patients_collection()
    doc = await patients.find_one({"_id": oid})
    if not doc or index >= len(doc.get("symptoms", [])):
        raise HTTPException(status_code=404, detail="Symptom entry not found.")
    symptoms = doc["symptoms"]
    symptoms.pop(index)
    await patients.update_one({"_id": oid}, {"$set": {"symptoms": symptoms}})
    return {"symptoms": symptoms}


@router.delete("/{patient_id}/medicines/{index}")
async def delete_medicine(patient_id: str, index: int, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(patient_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient id.")
    patients = patients_collection()
    doc = await patients.find_one({"_id": oid})
    if not doc or index >= len(doc.get("medicines", [])):
        raise HTTPException(status_code=404, detail="Medicine entry not found.")
    medicines = doc["medicines"]
    medicines.pop(index)
    taken_ratio = sum(1 for m in medicines if m["taken"]) / max(len(medicines), 1)
    await patients.update_one({"_id": oid}, {"$set": {"medicines": medicines, "medicine_adherence": round(taken_ratio, 2)}})
    return {"medicines": medicines, "medicine_adherence": round(taken_ratio, 2)}