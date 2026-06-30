"""
Recovery predictor — inference only. Training lives in train_model.py.
"""
import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "recovery_model.pkl")

_model = None


def _load_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                "recovery_model.pkl not found. Run `python ml/train_model.py` first."
            )
        _model = joblib.load(MODEL_PATH)
    return _model


def predict_recovery(age: int, symptom_score: float, medicine_adherence: float) -> float:
    """Returns recovery probability as a percentage (0-100)."""
    model = _load_model()
    row = pd.DataFrame([{
        "age": age,
        "symptom_score": symptom_score,
        "medicine_adherence": medicine_adherence,
    }])
    prediction = model.predict(row)[0]
    return round(float(max(0, min(100, prediction))), 1)
