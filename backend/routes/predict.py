from fastapi import APIRouter, Depends

from models.patient import RecoveryInput
from ml.predict import predict_recovery
from utils.security import get_current_user

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/recovery")
async def predict_recovery_route(payload: RecoveryInput, user: dict = Depends(get_current_user)):
    """AI Recovery Predictor — age + symptom score + adherence -> recovery %."""
    percent = predict_recovery(
        age=payload.age,
        symptom_score=payload.symptom_score,
        medicine_adherence=payload.medicine_adherence,
    )
    return {"recovery_percent": percent}
