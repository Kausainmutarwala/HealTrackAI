"""
Admin-only endpoints — view everyone, reassign patients between
doctors, and delete any account. Requires the user's role to be
"Admin" (set only via a secret code at registration).
"""
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pydantic import BaseModel

from database.mongodb import users_collection, patients_collection
from utils.security import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


def _serialize_user(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "age": doc["age"],
        "email": doc["email"],
        "role": doc["role"],
    }


@router.get("/doctors")
async def list_all_doctors(user: dict = Depends(require_role("Admin"))):
    """All doctors, with how many patients are currently assigned to each."""
    users = users_collection()
    patients = patients_collection()

    docs = await users.find({"role": "Doctor"}).to_list(length=500)
    result = []
    for d in docs:
        doctor_id = str(d["_id"])
        count = await patients.count_documents({"doctor_id": doctor_id})
        result.append({**_serialize_user(d), "patient_count": count})
    return result


@router.get("/patients")
async def list_all_patients(user: dict = Depends(require_role("Admin"))):
    """All patients in the system, regardless of who they're assigned
    to — with their doctor's name resolved for display."""
    patients = patients_collection()
    users = users_collection()

    docs = await patients.find().to_list(length=1000)
    doctor_cache = {}
    result = []
    for p in docs:
        doctor_id = p.get("doctor_id")
        doctor_name = "Unassigned"
        if doctor_id:
            if doctor_id not in doctor_cache:
                try:
                    d = await users.find_one({"_id": ObjectId(doctor_id)})
                except Exception:
                    d = None
                doctor_cache[doctor_id] = d["name"] if d else "Unknown"
            doctor_name = doctor_cache[doctor_id]

        result.append({
            "id": str(p["_id"]),
            "user_id": p.get("user_id"),
            "name": p["name"],
            "age": p.get("age"),
            "recovery_percent": p.get("recovery_percent"),
            "risk_level": p.get("risk_level"),
            "doctor_id": doctor_id,
            "doctor_name": doctor_name,
        })
    return result


class ReassignRequest(BaseModel):
    doctor_id: str | None  # null to unassign


@router.put("/patients/{patient_id}/reassign")
async def reassign_patient(
    patient_id: str, payload: ReassignRequest, user: dict = Depends(require_role("Admin"))
):
    try:
        oid = ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid patient id.")

    patients = patients_collection()
    doc = await patients.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Patient not found.")

    if payload.doctor_id:
        try:
            doctor_oid = ObjectId(payload.doctor_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid doctor id.")
        doctor = await users_collection().find_one({"_id": doctor_oid, "role": "Doctor"})
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found.")

    await patients.update_one({"_id": oid}, {"$set": {"doctor_id": payload.doctor_id}})
    return {"reassigned": True}


@router.delete("/users/{user_id}")
async def delete_any_user(user_id: str, user: dict = Depends(require_role("Admin"))):
    """Admin can delete any account. Deleting a doctor unassigns (does
    NOT delete) their patients. Deleting a patient removes their
    tracking record too."""
    try:
        oid = ObjectId(user_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    target = await users_collection().find_one({"_id": oid})
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if target["role"] == "Patient":
        await patients_collection().delete_one({"user_id": user_id})
    elif target["role"] == "Doctor":
        await patients_collection().update_many(
            {"doctor_id": user_id}, {"$set": {"doctor_id": None}}
        )

    await users_collection().delete_one({"_id": oid})
    return {"deleted": True}