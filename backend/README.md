# HealTrack AI — Backend

FastAPI + MongoDB + scikit-learn. Matches the PPT feature list: AI Recovery
Predictor, Risk Assessment Engine, Patient/Doctor APIs, Emergency Alerts,
Authentication.

## Setup

```bash
cd backend
pip install -r requirements.txt --break-system-packages   # or use a venv

cp .env.example .env
# edit .env -> put your real MongoDB Atlas URI and a random JWT_SECRET
```

## Train the ML models (one-time, ~5 seconds)

```bash
python ml/generate_dataset.py   # writes dataset/patient_recovery.csv
python ml/train_model.py        # writes ml/models/*.pkl
```

This regenerates `recovery_model.pkl`, `risk_model.pkl`, and
`risk_label_encoder.pkl`. The `.pkl` files are already included in this zip,
pre-trained — you only need to re-run this if you change the dataset.

## Run

```bash
uvicorn main:app --reload
```

Visit `http://127.0.0.1:8000` -> `{"message": "HealTrack AI Backend Running"}`
Visit `http://127.0.0.1:8000/docs` for interactive Swagger docs (test every
endpoint from the browser, no Postman needed).

## Endpoints

| Method | Path                                     | Who        | What |
|--------|-------------------------------------------|------------|------|
| POST   | `/auth/register`                          | anyone     | Create account (Patient or Doctor) |
| POST   | `/auth/login`                             | anyone     | Get a JWT |
| GET    | `/patients`                               | Doctor     | List all patients + recovery/risk |
| GET    | `/patients/{id}`                          | logged in  | One patient's profile |
| POST   | `/patients/{id}/symptoms`                 | logged in  | Log a symptom -> re-runs the AI models |
| POST   | `/patients/{id}/medicines/{index}/toggle` | logged in  | Mark a dose taken/not taken |
| POST   | `/predict/recovery`                       | logged in  | Direct access to the recovery model |
| POST   | `/risk/assess`                            | logged in  | Direct access to the risk classifier |
| GET    | `/alerts`                                 | Doctor     | All patients currently flagged High risk |

All routes except `/auth/*` need `Authorization: Bearer <token>`.

## Connecting the frontend

In the frontend's `.env` (create if missing):
```
VITE_API_BASE_URL=http://127.0.0.1:8000
```
Then in `frontend/src/services/api.js`, uncomment the real `fetch()` calls
(the mock versions are right above each one — swap them).

## Notes on the ML models

- `dataset/patient_recovery.csv` is **synthetic** (1500 rows, generated with a
  realistic relationship between age/symptoms/adherence and recovery — not
  random noise). Swap in real data later by keeping the same column names:
  `age, symptom_score, medicine_adherence, recovery_percent, risk_level`.
- Recovery predictor: `RandomForestRegressor`, ~4 percentage points average
  error on held-out data.
- Risk classifier: `RandomForestClassifier`, ~90% accuracy on held-out data.
- If a judge asks "is this a neural network" — no, it's Random Forest, which
  is the honest and also the *better* choice for this dataset size. Worth
  saying that out loud rather than overclaiming.

## If MongoDB isn't reachable

The app still boots (`connect_db()` doesn't crash on a bad connection string)
so you can demo `/docs`, `/predict/recovery`, and `/risk/assess` even without
a live database. Routes that touch `/patients` or `/auth` will fail until
Mongo is actually reachable.
