from pydantic import BaseModel, EmailStr, Field
from typing import Literal, Optional


class UserRegister(BaseModel):
    name: str
    age: int = Field(gt=0, lt=130)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal["Patient", "Doctor", "Admin"] = "Patient"
    doctor_id: Optional[str] = None  # only used when role == "Patient"
    admin_code: Optional[str] = None  # only used when role == "Admin"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    age: int
    email: EmailStr
    role: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: UserOut