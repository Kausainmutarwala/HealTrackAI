"""
Messaging — direct chat between a doctor and their assigned patient.
A "thread" is identified by the pair (doctor_id, patient_user_id).
Messages are stored flat with both ids on every message so we can
query a thread with a single filter.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from database.mongodb import get_db, users_collection, patients_collection
from utils.security import get_current_user

router = APIRouter(prefix="/messages", tags=["messages"])


def messages_collection():
    return get_db()["messages"]


def _serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "doctor_id": doc["doctor_id"],
        "patient_user_id": doc["patient_user_id"],
        "sender_id": doc["sender_id"],
        "sender_role": doc["sender_role"],
        "text": doc["text"],
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


async def _resolve_thread(user: dict, other_user_id: str | None):
    """Figure out (doctor_id, patient_user_id) for the current user.
    - If current user is a Patient: doctor_id = their assigned doctor, patient_user_id = themself.
    - If current user is a Doctor: patient_user_id = other_user_id (required), doctor_id = themself.
    """
    if user["role"] == "Patient":
        patient = await patients_collection().find_one({"user_id": user["sub"]})
        if not patient:
            raise HTTPException(status_code=404, detail="Patient record not found.")
        doctor_id = patient.get("doctor_id")
        if not doctor_id:
            raise HTTPException(status_code=400, detail="No doctor assigned yet.")
        return doctor_id, user["sub"]

    elif user["role"] == "Doctor":
        if not other_user_id:
            raise HTTPException(status_code=400, detail="patient_user_id is required for doctors.")
        return user["sub"], other_user_id

    raise HTTPException(status_code=403, detail="Only doctors and patients can use messaging.")


@router.get("/threads")
async def list_my_threads(user: dict = Depends(get_current_user)):
    """For a Doctor: list every patient they have exchanged messages
    with (or are assigned to). For a Patient: just their one thread."""
    if user["role"] == "Patient":
        doctor_id, patient_user_id = await _resolve_thread(user, None)
        patient = await patients_collection().find_one({"user_id": patient_user_id})
        doctor = await users_collection().find_one({"_id": __import__("bson").ObjectId(doctor_id)}) if doctor_id else None
        return [{
            "doctor_id": doctor_id,
            "patient_user_id": patient_user_id,
            "other_name": doctor["name"] if doctor else "Doctor",
        }]

    elif user["role"] == "Doctor":
        patients = patients_collection()
        coll = messages_collection()
        # Patients assigned to this doctor
        assigned = await patients.find({"doctor_id": user["sub"]}).to_list(length=500)
        threads = []
        for p in assigned:
            last = await coll.find(
                {"doctor_id": user["sub"], "patient_user_id": p["user_id"]}
            ).sort("created_at", -1).to_list(length=1)
            threads.append({
                "doctor_id": user["sub"],
                "patient_user_id": p["user_id"],
                "other_name": p["name"],
                "last_message": last[0]["text"] if last else None,
                "last_at": last[0]["created_at"].isoformat() if last else None,
            })
        return threads

    raise HTTPException(status_code=403, detail="Only doctors and patients can use messaging.")


@router.get("")
async def get_messages(patient_user_id: str | None = None, user: dict = Depends(get_current_user)):
    doctor_id, resolved_patient_id = await _resolve_thread(user, patient_user_id)
    coll = messages_collection()
    docs = await coll.find(
        {"doctor_id": doctor_id, "patient_user_id": resolved_patient_id}
    ).sort("created_at", 1).to_list(length=500)
    return [_serialize(d) for d in docs]


class MessageCreate(BaseModel):
    text: str
    patient_user_id: str | None = None  # required when sender is a Doctor


@router.post("")
async def send_message(payload: MessageCreate, user: dict = Depends(get_current_user)):
    doctor_id, patient_user_id = await _resolve_thread(user, payload.patient_user_id)

    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    doc = {
        "doctor_id": doctor_id,
        "patient_user_id": patient_user_id,
        "sender_id": user["sub"],
        "sender_role": user["role"],
        "text": payload.text.strip(),
        "created_at": datetime.now(timezone.utc),
    }
    coll = messages_collection()
    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Notify the other party
    try:
        from routes.notifications import push_notification
        recipient_id = patient_user_id if user["role"] == "Doctor" else doctor_id
        sender_label = "Your doctor" if user["role"] == "Doctor" else "Your patient"
        await push_notification(
            recipient_id, "New message", f"{sender_label} sent you a message.", "info"
        )
    except Exception:
        pass  # notification failure should never block the chat

    return _serialize(doc)