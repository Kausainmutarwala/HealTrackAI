from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from typing import Optional, Literal
from pydantic import BaseModel
from database.mongodb import get_db
from utils.security import get_current_user

router = APIRouter(prefix="/appointments", tags=["appointments"])


def serialize(appt) -> dict:
    return {
        "id": str(appt["_id"]),
        "patient_id": str(appt.get("patient_id", "") or ""),
        "patient_name": appt.get("patient_name", ""),
        "doctor_id": str(appt.get("doctor_id", "") or ""),
        "doctor_name": appt.get("doctor_name", ""),
        "date": appt.get("date", ""),
        "time": appt.get("time", ""),
        "reason": appt.get("reason", ""),
        "notes": appt.get("notes", ""),
        "type": appt.get("type", "In-person"),
        "status": appt.get("status", "Pending"),
        "created_at": appt.get("created_at", ""),
        "booked_by": appt.get("booked_by", "Patient"),
    }


class AppointmentCreate(BaseModel):
    date: str
    time: str
    reason: str
    notes: Optional[str] = ""
    type: Literal["In-person", "Video"] = "In-person"


class AppointmentUpdate(BaseModel):
    status: Literal["Pending", "Confirmed", "Cancelled"]
    notes: Optional[str] = None


# ── Patient books appointment ─────────────────────────────────────────────────
@router.post("")
async def create_appointment(body: AppointmentCreate, current_user=Depends(get_current_user)):
    db = get_db()
    appointments_col = db["appointments"]
    patients_col = db["patients"]
    users_col = db["users"]

    if current_user["role"] == "Patient":
        patient = await patients_col.find_one({"user_id": current_user["sub"]})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient record not found")

        doctor_id = patient.get("doctor_id")
        doctor_name = "Unassigned"
        if doctor_id:
            try:
                doctor = await users_col.find_one({"_id": ObjectId(str(doctor_id))})
                doctor_name = doctor["name"] if doctor else "Unassigned"
            except Exception:
                pass
        patient_name = current_user["name"]
        booked_by = "Patient"
        patient_oid = patient["_id"]

    elif current_user["role"] == "Doctor":
        doctor_id = current_user["sub"]
        doctor_name = current_user["name"]
        patient_name = "TBD"
        booked_by = "Doctor"
        patient_oid = None
    else:
        raise HTTPException(status_code=403, detail="Only patients and doctors can book appointments")

    appt = {
        "patient_id": patient_oid,
        "patient_name": patient_name,
        "doctor_id": ObjectId(str(doctor_id)) if doctor_id else None,
        "doctor_name": doctor_name,
        "date": body.date,
        "time": body.time,
        "reason": body.reason,
        "notes": body.notes or "",
        "type": body.type,
        "status": "Pending",
        "booked_by": booked_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await appointments_col.insert_one(appt)
    appt["_id"] = result.inserted_id
    return serialize(appt)


# ── Doctor books for specific patient ─────────────────────────────────────────
@router.post("/for-patient/{patient_id}")
async def create_appointment_for_patient(
    patient_id: str,
    body: AppointmentCreate,
    current_user=Depends(get_current_user)
):
    if current_user["role"] != "Doctor":
        raise HTTPException(status_code=403, detail="Only doctors can use this endpoint")

    db = get_db()
    patients_col = db["patients"]
    users_col = db["users"]
    appointments_col = db["appointments"]

    try:
        patient = await patients_col.find_one({"_id": ObjectId(patient_id)})
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid patient ID")

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    try:
        patient_user = await users_col.find_one({"_id": ObjectId(str(patient["user_id"]))})
        patient_name = patient_user["name"] if patient_user else "Unknown Patient"
    except Exception:
        patient_name = "Unknown Patient"

    appt = {
        "patient_id": patient["_id"],
        "patient_name": patient_name,
        "doctor_id": ObjectId(current_user["sub"]),
        "doctor_name": current_user["name"],
        "date": body.date,
        "time": body.time,
        "reason": body.reason,
        "notes": body.notes or "",
        "type": body.type,
        "status": "Pending",
        "booked_by": "Doctor",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    result = await appointments_col.insert_one(appt)
    appt["_id"] = result.inserted_id
    return serialize(appt)


# ── List appointments (role-filtered) ─────────────────────────────────────────
@router.get("")
async def list_appointments(current_user=Depends(get_current_user)):
    db = get_db()
    appointments_col = db["appointments"]
    patients_col = db["patients"]

    if current_user["role"] == "Patient":
        try:
            user_oid = ObjectId(str(current_user["sub"]))
        except Exception:
            return []
        patient = await patients_col.find_one({"user_id": current_user["sub"]})
        if not patient:
            return []
        cursor = appointments_col.find({"patient_id": patient["_id"]})

    elif current_user["role"] == "Doctor":
        try:
            doc_oid = ObjectId(str(current_user["sub"]))
        except Exception:
            return []
        cursor = appointments_col.find({"$or": [{"doctor_id": doc_oid}, {"doctor_id": None}]})

    elif current_user["role"] == "Admin":
        cursor = appointments_col.find({})

    else:
        return []

    results = []
    async for appt in cursor:
        results.append(serialize(appt))
    return results


# ── Update status ─────────────────────────────────────────────────────────────
@router.patch("/{appt_id}")
async def update_appointment(
    appt_id: str,
    body: AppointmentUpdate,
    current_user=Depends(get_current_user)
):
    db = get_db()
    appointments_col = db["appointments"]

    try:
        oid = ObjectId(appt_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    appt = await appointments_col.find_one({"_id": oid})
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if current_user["role"] == "Patient" and body.status != "Cancelled":
        raise HTTPException(status_code=403, detail="Patients can only cancel appointments")

    update = {"status": body.status}
    if body.notes is not None:
        update["notes"] = body.notes

    await appointments_col.update_one({"_id": oid}, {"$set": update})
    appt.update(update)
    return serialize(appt)


# ── Delete ────────────────────────────────────────────────────────────────────
@router.delete("/{appt_id}")
async def delete_appointment(appt_id: str, current_user=Depends(get_current_user)):
    db = get_db()
    appointments_col = db["appointments"]

    try:
        oid = ObjectId(appt_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid appointment ID")

    result = await appointments_col.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return {"deleted": True}