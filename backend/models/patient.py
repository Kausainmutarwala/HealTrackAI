from pydantic import BaseModel, Field
from typing import Literal, Optional


class MedicineItem(BaseModel):
    name: str
    time: str
    taken: bool = False


class PatientCreate(BaseModel):
    user_id: str
    name: str
    age: int
    medicines: list[MedicineItem] = []


class PatientOut(BaseModel):
    id: str
    name: str
    age: int
    recovery_percent: float = 0
    risk_level: Literal["Low", "Medium", "High"] = "Low"
    risk_note: Optional[str] = None
    medicine_adherence: float = Field(default=0, ge=0, le=1)
    symptom_score: float = Field(default=0, ge=0, le=10)
    medicines: list[MedicineItem] = []


class RecoveryInput(BaseModel):
    age: int = Field(gt=0, lt=130)
    symptom_score: float = Field(ge=0, le=10, description="0 = no symptoms, 10 = severe")
    medicine_adherence: float = Field(ge=0, le=1, description="0 = none taken, 1 = fully adherent")


class RiskOutput(BaseModel):
    risk_level: Literal["Low", "Medium", "High"]
    note: str
