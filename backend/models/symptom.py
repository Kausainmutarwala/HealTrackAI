from pydantic import BaseModel, Field
from typing import Literal


class SymptomCreate(BaseModel):
    patient_id: str
    label: str
    severity: Literal["None", "Mild", "Moderate", "Severe"] = "Mild"


class SymptomOut(BaseModel):
    id: str
    label: str
    severity: str
    logged_at: str
