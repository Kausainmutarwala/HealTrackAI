"""
Notifications — in-app alerts for patients and doctors (appointment
updates, reminders, system messages). Each notification belongs to
exactly one recipient (user_id from JWT "sub").
"""
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from pydantic import BaseModel

from database.mongodb import get_db
from utils.security import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


def notifications_collection():
    return get_db()["notifications"]


def _serialize(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "message": doc["message"],
        "type": doc.get("type", "info"),  # info | success | warning | danger
        "is_read": doc.get("is_read", False),
        "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
    }


class NotificationCreate(BaseModel):
    user_id: str  # recipient's user id (the "sub" stored on their account)
    title: str
    message: str
    type: str = "info"


@router.get("")
async def list_my_notifications(user: dict = Depends(get_current_user)):
    coll = notifications_collection()
    docs = await coll.find({"user_id": user["sub"]}).sort("created_at", -1).to_list(length=200)
    return [_serialize(d) for d in docs]


@router.get("/unread-count")
async def unread_count(user: dict = Depends(get_current_user)):
    coll = notifications_collection()
    count = await coll.count_documents({"user_id": user["sub"], "is_read": False})
    return {"unread": count}


@router.post("")
async def create_notification(payload: NotificationCreate, user: dict = Depends(get_current_user)):
    """Any logged-in user can push a notification to another user_id —
    used by doctors (e.g. 'take your medicine') or by other backend
    routes (appointment confirmed, risk alert, etc.)."""
    coll = notifications_collection()
    doc = {
        "user_id": payload.user_id,
        "title": payload.title,
        "message": payload.message,
        "type": payload.type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
    }
    result = await coll.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize(doc)


@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification id.")

    coll = notifications_collection()
    result = await coll.update_one(
        {"_id": oid, "user_id": user["sub"]}, {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"updated": True}


@router.patch("/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    coll = notifications_collection()
    await coll.update_many({"user_id": user["sub"], "is_read": False}, {"$set": {"is_read": True}})
    return {"updated": True}


@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(notification_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid notification id.")

    coll = notifications_collection()
    result = await coll.delete_one({"_id": oid, "user_id": user["sub"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found.")
    return {"deleted": True}


# Helper for OTHER backend routes to call directly (e.g. from appointments.py
# after confirming/cancelling, or from risk.py after a high-risk prediction).
# Usage: from routes.notifications import push_notification
#        await push_notification(patient_user_id, "Appointment confirmed", "...", "success")
async def push_notification(user_id: str, title: str, message: str, type: str = "info"):
    coll = notifications_collection()
    await coll.insert_one({
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type,
        "is_read": False,
        "created_at": datetime.now(timezone.utc),
    })