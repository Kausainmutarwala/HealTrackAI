"""
Generates dataset/patient_recovery.csv — a synthetic but realistically-shaped
dataset, since real hospital data isn't available for the hackathon demo.

Relationship modeled (deliberately, not random noise):
  - higher symptom_score      -> lower recovery, higher risk
  - lower medicine_adherence  -> lower recovery, higher risk
  - higher age                -> slightly lower recovery, higher risk
"""
import numpy as np
import pandas as pd
import os

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "dataset", "patient_recovery.csv")


def generate(n_rows: int = 1500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    age = rng.integers(12, 85, size=n_rows)
    symptom_score = rng.uniform(0, 10, size=n_rows)
    medicine_adherence = rng.uniform(0, 1, size=n_rows)

    # Base recovery probability driven by the three features + noise
    raw_score = (
        100
        - symptom_score * 6.0
        + medicine_adherence * 35.0
        - (age - 30).clip(min=0) * 0.25
    )
    noise = rng.normal(0, 6, size=n_rows)
    recovery_percent = np.clip(raw_score + noise, 2, 99)

    # Risk level derived from recovery + symptom severity (not just a copy
    # of recovery, so the classifier learns a slightly distinct boundary)
    risk_score = (100 - recovery_percent) * 0.6 + symptom_score * 4
    risk_level = np.select(
        [risk_score < 35, risk_score < 60],
        ["Low", "Medium"],
        default="High",
    )

    df = pd.DataFrame({
        "age": age,
        "symptom_score": np.round(symptom_score, 2),
        "medicine_adherence": np.round(medicine_adherence, 2),
        "recovery_percent": np.round(recovery_percent, 1),
        "risk_level": risk_level,
    })
    return df


if __name__ == "__main__":
    df = generate()
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    df.to_csv(OUTPUT_PATH, index=False)
    print(f"Wrote {len(df)} rows to {OUTPUT_PATH}")
    print(df["risk_level"].value_counts())
