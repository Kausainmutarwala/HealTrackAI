# 🏥 HealTrack AI

> An AI-powered healthcare recovery tracking platform connecting patients, doctors, and administrators — built with FastAPI, React, and LLaMA 3.3 70B.

![HealTrack AI](https://img.shields.io/badge/HealTrack-AI-2dd4bf?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)

---

## 🚀 Live Demo

- **Frontend:** [heal-track-ai-rho.vercel.app](https://heal-track-ai-rho.vercel.app)
- **Backend API:** [healtrack-backend-gtb4.onrender.com](https://healtrack-backend-gtb4.onrender.com)
- **API Docs:** [healtrack-backend-gtb4.onrender.com/docs](https://healtrack-backend-gtb4.onrender.com/docs)

---

## 🧠 What is HealTrack AI?

HealTrack AI solves a critical real-world problem — **post-treatment recovery monitoring is broken**. Patients forget medicines, skip follow-ups, and have no way to communicate urgency to their doctors between appointments. Doctors have no real-time visibility into how their patients are recovering at home.

HealTrack AI bridges this gap with:
- **Predictive ML** that tracks recovery % and risk level in real time
- **Generative AI** that turns raw health data into actionable insights
- **Direct communication** between doctors and patients
- **Emergency SOS** for critical situations

---

## ✨ Features

### 👤 Patient
| Feature | Description |
|---|---|
| Recovery Dashboard | Real-time recovery % and risk level (ML-powered) |
| Symptom Tracking | Log symptoms with severity, autocomplete from 100+ conditions |
| Medicine Tracker | Add medicines with time reminders, mark as taken |
| 💊 Medicine Reminders | Browser push notifications when medicine is due |
| 🚨 Emergency SOS | One-click alert to doctor and admin |
| AI Health Insight | Pattern analysis across all logged symptoms |
| Appointments | Book appointments with assigned doctor |
| Messaging | Real-time chat with assigned doctor |
| Notifications | In-app alerts for appointments, messages, SOS |
| Recovery Timeline | Chronological history of symptoms and weekly snapshots |
| Progress Report PDF | Download full recovery report as PDF |
| Health Tips | Daily personalized health tips based on risk level |
| Profile | Photo upload, password change, personal info |

### 👨‍⚕️ Doctor
| Feature | Description |
|---|---|
| Patient Overview | All assigned patients with risk badges and recovery bars |
| Patient Detail | Full symptom history, medicine list, recovery chart |
| AI Case Briefing | AI-generated patient summary before opening the chart |
| 📋 Discharge Summary | AI drafts discharge summary, doctor edits, PDF download |
| Appointments | View, confirm, and cancel appointments |
| Messaging | Direct chat with each patient |
| Notifications | SOS alerts, appointment updates, messages |

### 🔧 Admin
| Feature | Description |
|---|---|
| Admin Console | View all doctors and patients in the system |
| Doctor-Patient Assignment | Reassign patients between doctors |
| Account Management | Delete doctor or patient accounts |

---

## 🤖 AI Components

### 1. Recovery Prediction Model (scikit-learn)
- **Algorithm:** RandomForestRegressor
- **Inputs:** Age, symptom severity score, medicine adherence
- **Output:** Recovery percentage (0–100%)
- **Triggers:** Every time a new symptom is logged

### 2. Risk Classification Model (scikit-learn)
- **Algorithm:** RandomForestClassifier
- **Inputs:** Same as recovery model
- **Output:** Risk level — Low / Medium / High
- **Triggers:** Every time a new symptom is logged

### 3. AI Health Chatbot (Groq — LLaMA 3.3 70B)
- Symptom-specific diet and lifestyle advice
- Free-text health Q&A
- Rule-based fallback if AI is unavailable

### 4. AI Health Insight
- Analyzes all recent symptoms together as a pattern
- Returns possible considerations + urgency level
- Explicitly NOT a diagnosis — informational only

### 5. AI Case Briefing (Doctor-facing)
- Synthesizes patient data into a 3–4 sentence clinical briefing
- Helps doctors quickly understand a patient's status

### 6. AI Discharge Summary
- Generates a professional discharge summary draft
- Doctor can edit before downloading as PDF

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router v6 |
| Backend | FastAPI (Python 3.12), Uvicorn |
| Database | MongoDB Atlas (Motor async driver) |
| ML Models | scikit-learn (RandomForest) |
| LLM | Groq API — LLaMA 3.3 70B Versatile |
| Auth | JWT (python-jose + bcrypt) |
| PDF Generation | jsPDF |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 📁 Project Structure

```
HealTrackAI/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, routers
│   ├── routes/
│   │   ├── auth.py              # Register, login, profile
│   │   ├── patients.py          # Symptoms, medicines, recovery
│   │   ├── chat.py              # AI chatbot, insights, summaries
│   │   ├── appointments.py      # Booking system
│   │   ├── notifications.py     # In-app alerts
│   │   ├── messages.py          # Doctor-patient chat
│   │   ├── sos.py               # Emergency SOS
│   │   └── admin.py             # Admin panel routes
│   ├── ml/
│   │   ├── predict.py           # Recovery prediction (RandomForest)
│   │   └── risk_engine.py       # Risk classification (RandomForest)
│   ├── database/
│   │   └── mongodb.py           # Motor async MongoDB client
│   ├── models/
│   │   └── user.py              # Pydantic models
│   ├── utils/
│   │   └── security.py          # JWT, bcrypt, role guards
│   └── .env                     # Environment variables (not committed)
│
└── frontend/
    ├── src/
    │   ├── pages/               # Route-level components
    │   ├── components/          # Reusable UI components
    │   ├── services/api.js      # All API calls
    │   ├── hooks/               # Custom hooks (medicine reminders)
    │   └── utils/dateUtils.js   # Timezone-safe date formatting
    ├── vercel.json              # SPA routing fix
    └── .env                     # VITE_API_URL (not committed)
```

---

## ⚙️ Local Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- MongoDB (local or Atlas)
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Backend

```bash
cd backend
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in: MONGO_URI, GROQ_API_KEY, JWT_SECRET

uvicorn main:app --reload
# Running at http://127.0.0.1:8000
```

### Frontend

```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://127.0.0.1:8000" > .env

npm run dev
# Running at http://localhost:5173
```

---

## 🌍 Environment Variables

### Backend (`backend/.env`)
```env
MONGO_URI=mongodb+srv://...
MONGO_DB_NAME=healtrack_ai
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
GROQ_API_KEY=gsk_...
BACKEND_URL=https://healtrack-backend-gtb4.onrender.com
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://healtrack-backend-gtb4.onrender.com
```

---

## 🔐 User Roles

| Role | Access |
|---|---|
| **Patient** | Personal dashboard, symptoms, medicines, appointments, chat, SOS |
| **Doctor** | All assigned patients, case summaries, discharge summaries, appointments |
| **Admin** | System-wide management, doctor-patient assignment |

---

## 📊 Real-World Problem Solved

- 🇮🇳 India has only ~1.2M doctors for 1.4B people (WHO standard: 1:1000, India: 1:1700+)
- 50%+ post-surgery patients don't get proper follow-up care
- Medicine non-adherence causes $500B+ in preventable healthcare costs globally
- HealTrack AI enables remote monitoring so doctors can focus on high-risk patients

---

## 👨‍💻 Built By

**Kausain** — B.Tech CSE (AI/ML), Parul University  
GitHub: [@kausainmutarwala](https://github.com/kausainmutarwala)

---

## 📄 License

MIT License — free to use, modify, and distribute.