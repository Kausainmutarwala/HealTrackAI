"""
Risk engine — inference only. Training lives in train_model.py.
"""
import os
import joblib
import pandas as pd

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
RISK_MODEL_PATH = os.path.join(MODELS_DIR, "risk_model.pkl")
ENCODER_PATH = os.path.join(MODELS_DIR, "risk_label_encoder.pkl")

_model = None
_encoder = None


def _load():
    global _model, _encoder
    if _model is None or _encoder is None:
        if not os.path.exists(RISK_MODEL_PATH):
            raise FileNotFoundError(
                "risk_model.pkl not found. Run `python ml/train_model.py` first."
            )
        _model = joblib.load(RISK_MODEL_PATH)
        _encoder = joblib.load(ENCODER_PATH)
    return _model, _encoder


def _note_for(level: str, symptom_score: float, medicine_adherence: float) -> str:
    if level == "High":
        return "Recovery has slowed and symptom severity is elevated — flagging for doctor review."
    if level == "Medium":
        if medicine_adherence < 0.6:
            return "Adherence has been inconsistent. Encourage sticking to the medicine schedule."
        return "Symptom score is moderate. Keep monitoring over the next few days."
    return "Adherence and symptom score are both stable."


def classify_risk(age: int, symptom_score: float, medicine_adherence: float) -> dict:
    """Returns {'risk_level': 'Low'|'Medium'|'High', 'note': str}"""
    model, encoder = _load()
    row = pd.DataFrame([{
        "age": age,
        "symptom_score": symptom_score,
        "medicine_adherence": medicine_adherence,
    }])
    encoded_pred = model.predict(row)[0]
    level = encoder.inverse_transform([encoded_pred])[0]
    return {
        "risk_level": level,
        "note": _note_for(level, symptom_score, medicine_adherence),
    }
