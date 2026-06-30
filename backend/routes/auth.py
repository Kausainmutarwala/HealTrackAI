from fastapi import APIRouter, HTTPException
from bson import ObjectId
from typing import Optional
from pydantic import BaseModel
from fastapi import Depends

from models.user import UserRegister, UserLogin, Token, UserOut
from database.mongodb import users_collection, patients_collection
from utils.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None


@router.post("/register", response_model=Token)
async def register(payload: UserRegister):
    users = users_collection()

    existing = await users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user_doc = {
        "name": payload.name,
        "age": payload.age,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
    }
    result = await users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Patients get a tracking profile created right away so the dashboard
    # has something to show on first login.
    if payload.role == "Patient":
        await patients_collection().insert_one({
            "user_id": user_id,
            "name": payload.name,
            "age": payload.age,
            "recovery_percent": 50.0,
            "risk_level": "Low",
            "risk_note": "No data logged yet.",
            "medicine_adherence": 0.0,
            "symptom_score": 0.0,
            "medicines": [],
            "symptoms": [],
        })

    token = create_access_token({"sub": user_id, "role": payload.role, "name": payload.name})
    return Token(
        access_token=token,
        role=payload.role,
        user=UserOut(id=user_id, name=payload.name, age=payload.age, email=payload.email, role=payload.role),
    )


@router.post("/login", response_model=Token)
async def login(payload: UserLogin):
    users = users_collection()
    user = await users.find_one({"email": payload.email})

    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    user_id = str(user["_id"])
    token = create_access_token({"sub": user_id, "role": user["role"], "name": user["name"]})
    return Token(
        access_token=token,
        role=user["role"],
        user=UserOut(id=user_id, name=user["name"], age=user["age"], email=user["email"], role=user["role"]),
    )


@router.get("/me", response_model=UserOut)
async def get_me(user: dict = Depends(get_current_user)):
    """Returns the logged-in user's own profile — works for both
    Patient and Doctor accounts (unlike /patients/me which only
    applies to patients)."""
    try:
        oid = ObjectId(user["sub"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    doc = await users_collection().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")

    return UserOut(id=str(doc["_id"]), name=doc["name"], age=doc["age"], email=doc["email"], role=doc["role"])


@router.put("/me", response_model=UserOut)
async def update_me(payload: UserUpdate, user: dict = Depends(get_current_user)):
    """Lets the logged-in user update their own name/age. If they're a
    patient, the same name/age is mirrored onto their patient record so
    the dashboard and doctor's patient list stay in sync."""
    try:
        oid = ObjectId(user["sub"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    update_data = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}

    if update_data:
        users = users_collection()
        await users.update_one({"_id": oid}, {"$set": update_data})

        if user.get("role") == "Patient":
            sync_fields = {k: v for k, v in update_data.items() if k in ("name", "age")}
            if sync_fields:
                await patients_collection().update_one({"user_id": user["sub"]}, {"$set": sync_fields})

    doc = await users_collection().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")

    return UserOut(id=str(doc["_id"]), name=doc["name"], age=doc["age"], email=doc["email"], role=doc["role"])
@router.get("/doctors")
async def get_doctors():
    """Returns list of all registered doctors — used in patient registration dropdown."""
    users = users_collection()
    cursor = users.find({"role": "Doctor"}, {"_id": 1, "name": 1, "email": 1})
    doctors = []
    async for doc in cursor:
        doctors.append({"id": str(doc["_id"]), "name": doc["name"], "email": doc.get("email", "")})
    return doctors
# ===== Append these to routes/auth.py =====
# Requires these imports already present at the top of auth.py:
#   from pydantic import BaseModel
#   from fastapi import Depends, HTTPException
#   from bson import ObjectId
#   from utils.security import hash_password, verify_password, get_current_user
#   from database.mongodb import users_collection, patients_collection


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


@router.put("/me/password")
async def change_password(payload: PasswordChange, user: dict = Depends(get_current_user)):
    """Lets the logged-in user change their own password after
    verifying the current one."""
    try:
        oid = ObjectId(user["sub"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    users = users_collection()
    doc = await users.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(payload.current_password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

    new_hash = hash_password(payload.new_password)
    await users.update_one({"_id": oid}, {"$set": {"password_hash": new_hash}})
    return {"updated": True}


class PhotoUpdate(BaseModel):
    photo_base64: str  # data URL, e.g. "data:image/jpeg;base64,...."


@router.put("/me/photo")
async def update_photo(payload: PhotoUpdate, user: dict = Depends(get_current_user)):
    """Stores a profile photo as a base64 data URL directly on the
    user document — simplest possible approach, no file storage /
    S3 setup needed. Fine for small (<1MB) profile pictures."""
    try:
        oid = ObjectId(user["sub"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    if not payload.photo_base64.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Invalid image data.")

    # Rough size guard — base64 inflates size by ~33%, so cap around 2MB raw.
    if len(payload.photo_base64) > 2_800_000:
        raise HTTPException(status_code=400, detail="Image too large. Please use a smaller photo (under 2MB).")

    users = users_collection()
    await users.update_one({"_id": oid}, {"$set": {"photo_base64": payload.photo_base64}})

    # Mirror onto the patient record too, so doctors see the photo in their patient list.
    if user.get("role") == "Patient":
        await patients_collection().update_one(
            {"user_id": user["sub"]}, {"$set": {"photo_base64": payload.photo_base64}}
        )

    return {"updated": True}


@router.get("/me/photo")
async def get_my_photo(user: dict = Depends(get_current_user)):
    """Returns just the photo — useful because /auth/me uses a fixed
    UserOut response model that doesn't include photo_base64."""
    try:
        oid = ObjectId(user["sub"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    doc = await users_collection().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")

    return {"photo_base64": doc.get("photo_base64")}


@router.delete("/me/photo")
async def remove_photo(user: dict = Depends(get_current_user)):
    try:
        oid = ObjectId(user["sub"])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid user id.")

    users = users_collection()
    await users.update_one({"_id": oid}, {"$unset": {"photo_base64": ""}})

    if user.get("role") == "Patient":
        await patients_collection().update_one(
            {"user_id": user["sub"]}, {"$unset": {"photo_base64": ""}}
        )

    return {"updated": True}
# ===== Change Password =====
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.put("/change-password")
async def change_password(body: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    import bcrypt

    user = users_collection.find_one({"_id": ObjectId(current_user["sub"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not bcrypt.checkpw(body.current_password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    if len(body.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters.")

    new_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
    users_collection.update_one(
        {"_id": ObjectId(current_user["sub"])},
        {"$set": {"password_hash": new_hash}}
    )
    return {"message": "Password updated successfully."}