"""
Emergency SOS — a single button a patient presses when they need
urgent attention. Sends a high-priority notification to their
assigned doctor (and to all Admins as a fallback / oversight layer).
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from database.mongodb import get_db, patients_collection, users_collection
from utils.security import get_current_user
from routes.notifications import push_notification

router = APIRouter(prefix="/sos", tags=["sos"])


class SOSRequest(BaseModel):
    message: str = ""


@router.post("/trigger")
async def trigger_sos(payload: SOSRequest, user: dict = Depends(get_current_user)):
    if user["role"] != "Patient":
        raise HTTPException(status_code=403, detail="Only patients can trigger an SOS alert.")

    patient = await patients_collection().find_one({"user_id": user["sub"]})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient record not found.")

    note = payload.message.strip() or "No additional details provided."
    title = "🚨 Emergency SOS"
    message = f"{patient['name']} has triggered an emergency SOS alert. Note: {note}"

    notified_doctor = False
    doctor_id = patient.get("doctor_id")
    if doctor_id:
        await push_notification(doctor_id, title, message, "danger")
        notified_doctor = True

    # Always notify Admins too, so someone is alerted even if no
    # doctor is assigned, and as an oversight layer either way.
    admins = await users_collection().find({"role": "Admin"}).to_list(length=100)
    for admin in admins:
        await push_notification(str(admin["_id"]), title, message, "danger")

    # Log the SOS event itself for audit / demo purposes.
    await get_db()["sos_events"].insert_one({
        "patient_user_id": user["sub"],
        "patient_name": patient["name"],
        "message": note,
        "notified_doctor": notified_doctor,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "sent": True,
        "notified_doctor": notified_doctor,
        "notified_admins": len(admins),
    }