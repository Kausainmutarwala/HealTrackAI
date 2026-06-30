from fastapi import APIRouter, Depends

from models.patient import RecoveryInput
from ml.risk_engine import classify_risk
from database.mongodb import patients_collection
from utils.security import get_current_user, require_role

router = APIRouter(tags=["risk"])


@router.post("/risk/assess")
async def assess_risk(payload: RecoveryInput, user: dict = Depends(get_current_user)):
    """Risk Assessment Engine — same three inputs, returns Low/Medium/High + note."""
    return classify_risk(
        age=payload.age,
        symptom_score=payload.symptom_score,
        medicine_adherence=payload.medicine_adherence,
    )


@router.get("/alerts")
async def emergency_alerts(user: dict = Depends(require_role("Doctor"))):
    """Emergency Alert screen — every patient currently flagged High risk."""
    patients = patients_collection()
    docs = await patients.find({"risk_level": "High"}).to_list(length=200)

    return [
        {
            "id": str(d["_id"]),
            "patientName": d["name"],
            "message": d.get("risk_note", "Risk score crossed the High threshold."),
            "time": "Live",
        }
        for d in docs
    ]
