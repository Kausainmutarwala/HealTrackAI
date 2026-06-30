"""
Trains two models off dataset/patient_recovery.csv:
  1. RandomForestRegressor  -> predicts recovery_percent (0-100)
  2. RandomForestClassifier -> predicts risk_level (Low / Medium / High)

Run: python ml/train_model.py
Saves: ml/models/recovery_model.pkl, ml/models/risk_model.pkl, ml/models/risk_label_encoder.pkl
"""
import os
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, accuracy_score

BASE_DIR = os.path.dirname(__file__)
DATASET_PATH = os.path.join(BASE_DIR, "..", "dataset", "patient_recovery.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")

FEATURES = ["age", "symptom_score", "medicine_adherence"]


def main():
    if not os.path.exists(DATASET_PATH):
        from generate_dataset import generate
        os.makedirs(os.path.dirname(DATASET_PATH), exist_ok=True)
        generate().to_csv(DATASET_PATH, index=False)

    df = pd.read_csv(DATASET_PATH)
    X = df[FEATURES]

    # --- Recovery regressor ---
    y_recovery = df["recovery_percent"]
    X_train, X_test, y_train, y_test = train_test_split(X, y_recovery, test_size=0.2, random_state=42)

    recovery_model = RandomForestRegressor(n_estimators=150, max_depth=8, random_state=42)
    recovery_model.fit(X_train, y_train)
    mae = mean_absolute_error(y_test, recovery_model.predict(X_test))
    print(f"Recovery regressor — MAE: {mae:.2f} percentage points")

    # --- Risk classifier ---
    label_encoder = LabelEncoder()
    y_risk = label_encoder.fit_transform(df["risk_level"])  # Low/Medium/High -> 0/1/2

    Xr_train, Xr_test, yr_train, yr_test = train_test_split(X, y_risk, test_size=0.2, random_state=42)
    risk_model = RandomForestClassifier(n_estimators=150, max_depth=8, random_state=42)
    risk_model.fit(Xr_train, yr_train)
    acc = accuracy_score(yr_test, risk_model.predict(Xr_test))
    print(f"Risk classifier — accuracy: {acc:.2%}")

    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(recovery_model, os.path.join(MODELS_DIR, "recovery_model.pkl"))
    joblib.dump(risk_model, os.path.join(MODELS_DIR, "risk_model.pkl"))
    joblib.dump(label_encoder, os.path.join(MODELS_DIR, "risk_label_encoder.pkl"))
    print(f"Saved models to {MODELS_DIR}")


if __name__ == "__main__":
    main()
