"""
Hybrid health assistant — now powered by Groq (free, fast, no billing
card required — unlike Gemini's free tier which can show up as
zero-quota for some accounts/regions).

  1) /chat/symptom-advice — AI-generated do's/don'ts for any symptom,
     with a rule-based dictionary as a safety-net fallback if the AI
     call fails for any reason (so the feature never just breaks).
  2) /chat/ask — free-text question answered by the AI, for anything
     beyond a single symptom (e.g. "hello", general health questions).
"""
import os
import json
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

from utils.security import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

# ---------------------------------------------------------------------
# Rule-based fallback advice — only used if the AI call fails (rate
# limit, network issue, etc). Keeps the feature working even then.
# ---------------------------------------------------------------------
SYMPTOM_ADVICE = {
    "fever": {
        "eat": ["Light khichdi", "Coconut water", "Clear soups", "Fruits like oranges"],
        "avoid": ["Spicy food", "Cold drinks", "Heavy oily food"],
        "tip": "Rest, stay hydrated, and monitor temperature every few hours.",
    },
    "headache": {
        "eat": ["Plenty of water", "Bananas", "Ginger tea"],
        "avoid": ["Bright screens / loud noise", "Excess caffeine", "Skipping meals"],
        "tip": "Rest in a dark, quiet room. See a doctor if it's sudden and severe.",
    },
    "fatigue": {
        "eat": ["Iron-rich food (spinach, dates)", "Protein (eggs, dal)", "Plenty of water"],
        "avoid": ["Excess caffeine/sugar", "Skipping sleep"],
        "tip": "Prioritize 7-8 hours of sleep and short walks rather than total bed rest.",
    },
    "cough": {
        "eat": ["Warm water with honey", "Ginger tea", "Soups"],
        "avoid": ["Cold drinks", "Fried/oily food", "Smoke exposure"],
        "tip": "Steam inhalation can help. See a doctor if it lasts more than 2 weeks.",
    },
    "nausea": {
        "eat": ["Plain crackers", "Ginger", "Small frequent meals"],
        "avoid": ["Greasy/spicy food", "Strong smells", "Lying down right after eating"],
        "tip": "Eat small portions slowly rather than skipping meals entirely.",
    },
    "vomiting": {
        "eat": ["ORS / coconut water", "Plain rice or toast once settled", "Small sips of water"],
        "avoid": ["Solid heavy meals immediately after", "Dairy", "Spicy food"],
        "tip": "Stay hydrated in small sips. Seek medical help if it persists beyond a day.",
    },
    "joint pain": {
        "eat": ["Omega-3 rich food (fish, walnuts)", "Turmeric milk", "Anti-inflammatory foods"],
        "avoid": ["Excess sugar", "Processed food", "Prolonged inactivity"],
        "tip": "Gentle stretching and warm compresses can help reduce stiffness.",
    },
    "sore throat": {
        "eat": ["Warm salt water gargle", "Honey lemon tea", "Soft foods"],
        "avoid": ["Cold beverages", "Spicy/acidic food", "Smoking"],
        "tip": "Gargle with warm salt water 2-3 times a day.",
    },
    "chest pain": {
        "eat": ["Light, low-sodium meals"],
        "avoid": ["Heavy exertion", "Smoking", "Ignoring it"],
        "tip": "⚠️ Chest pain can be serious — please consult a doctor promptly, especially if severe.",
    },
    "dizziness": {
        "eat": ["Water", "Electrolytes (ORS)", "Small frequent meals"],
        "avoid": ["Standing up too quickly", "Skipping meals", "Driving"],
        "tip": "Sit or lie down until it passes. See a doctor if it's frequent.",
    },
    "back pain": {
        "eat": ["Calcium-rich food (milk, paneer)", "Anti-inflammatory foods", "Plenty of water"],
        "avoid": ["Heavy lifting", "Prolonged sitting", "Slouching posture"],
        "tip": "Gentle stretches and a firm mattress can help. See a doctor if it radiates down a leg.",
    },
}

DEFAULT_ADVICE = {
    "eat": ["Balanced home-cooked meals", "Plenty of water"],
    "avoid": ["Skipping meals", "Self-medicating without guidance"],
    "tip": "Monitor your symptoms and consult a doctor if they worsen or persist.",
}


class AdviceRequest(BaseModel):
    symptom: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None  # e.g. "Recovery 64%, symptoms: Fever (Moderate)"


def _rule_based_advice(label: str) -> dict:
    key = label.lower()
    for known, advice in SYMPTOM_ADVICE.items():
        if known in key or key in known:
            return {"symptom": label, "source": "rules", **advice}
    return {"symptom": label, "source": "rules", **DEFAULT_ADVICE}


@router.post("/symptom-advice")
async def symptom_advice(payload: AdviceRequest, user: dict = Depends(get_current_user)):
    label = payload.symptom.strip()

    if not GROQ_API_KEY:
        return _rule_based_advice(label)

    prompt = (
        f'A patient logged the symptom: "{label}". '
        'Respond with ONLY valid JSON, no extra text, in exactly this shape: '
        '{"eat": ["item1", "item2", "item3"], "avoid": ["item1", "item2", "item3"], "tip": "one short sentence"}. '
        "3 short food/lifestyle items to eat, 3 to avoid (each under 6 words), and one brief practical tip. "
        "If the symptom sounds serious (e.g. chest pain), the tip must recommend seeing a doctor promptly."
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 250,
                    "response_format": {"type": "json_object"},
                },
            )
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            if all(k in parsed for k in ("eat", "avoid", "tip")):
                return {"symptom": label, "source": "ai", **parsed}
        else:
            print(f"Groq API error {res.status_code} (symptom-advice): {res.text}")
    except Exception as e:
        print(f"AI symptom-advice failed, falling back to rules: {e}")

    return _rule_based_advice(label)


@router.post("/ask")
async def ask_ai(payload: ChatRequest, user: dict = Depends(get_current_user)):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="AI chat isn't configured yet — add GROQ_API_KEY to backend/.env",
        )

    system_context = (
        "You are a friendly, careful health assistant inside the HealTrack AI app. "
        "Have a natural conversation. If the patient mentions a symptom, give short, "
        "practical, safe lifestyle and diet suggestions to help recovery. Never diagnose. "
        "Add a brief reminder to consult a doctor for anything serious or worsening. "
        "Keep replies under 100 words, plain text, no markdown."
    )

    messages = [{"role": "system", "content": system_context}]
    if payload.context:
        messages.append({"role": "system", "content": f"Patient context: {payload.context}"})
    messages.append({"role": "user", "content": payload.message})

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={"model": GROQ_MODEL, "messages": messages, "max_tokens": 220},
            )
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not reach the AI service. Try again.")

    if res.status_code != 200:
        print(f"Groq API error {res.status_code} (ask): {res.text}")
        raise HTTPException(
            status_code=502,
            detail=f"AI service error ({res.status_code}). Check backend terminal for details.",
        )

    data = res.json()
    try:
        reply = data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        reply = "Sorry, I couldn't generate a response. Please try rephrasing your question."

    return {"reply": reply, "source": "ai"}
# ===== Append this to routes/chat.py (after the /ask endpoint) =====
# Requires nothing new — uses the same GROQ_API_KEY, GROQ_URL, GROQ_MODEL,
# httpx, json, BaseModel, get_current_user already imported at the top.


class InsightRequest(BaseModel):
    symptoms: list[dict]  # [{"label": "Fever", "severity": "Moderate"}, ...]
    age: Optional[int] = None
    recovery_percent: Optional[float] = None


@router.post("/health-insight")
async def health_insight(payload: InsightRequest, user: dict = Depends(get_current_user)):
    """Looks at a patient's recent logged symptoms TOGETHER (not one at
    a time) and gives a plain-language insight about what pattern they
    might suggest — explicitly NOT a diagnosis, always pushes toward
    seeing a real doctor. This is the same category of feature as a
    WebMD/Ada symptom checker: informational only, heavily disclaimed."""

    if not payload.symptoms:
        raise HTTPException(status_code=400, detail="No symptoms to analyze yet.")

    symptom_lines = ", ".join(
        f'{s.get("label", "Unknown")} ({s.get("severity", "Mild")})' for s in payload.symptoms[-10:]
    )

    fallback = {
        "summary": "Not enough information for an AI-generated insight right now. Please share these symptoms with your doctor directly.",
        "possible_considerations": [],
        "urgency": "routine",
        "source": "fallback",
    }

    if not GROQ_API_KEY:
        return fallback

    prompt = (
        f"A patient (age: {payload.age or 'unknown'}, recovery progress: "
        f"{payload.recovery_percent if payload.recovery_percent is not None else 'unknown'}%) "
        f"has logged these recent symptoms together: {symptom_lines}. "
        'Respond with ONLY valid JSON, no extra text, in exactly this shape: '
        '{"summary": "one or two plain-language sentences about what this symptom pattern '
        'could be related to, written for a non-medical person", '
        '"possible_considerations": ["short phrase 1", "short phrase 2", "short phrase 3"], '
        '"urgency": "routine" or "soon" or "urgent"}. '
        "IMPORTANT RULES: Never state a definite diagnosis. possible_considerations must be "
        "general categories (e.g. \"viral infection\", \"dehydration\"), not confident claims. "
        'Set urgency to "urgent" if symptoms suggest something potentially serious '
        "(e.g. chest pain, severe breathing difficulty, high fever with confusion), "
        '"soon" if it warrants a doctor visit within a few days, otherwise "routine".'
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a cautious medical information assistant. You NEVER diagnose. "
                                "You only describe general possible considerations and always encourage "
                                "professional medical evaluation."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 300,
                    "response_format": {"type": "json_object"},
                },
            )
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            if all(k in parsed for k in ("summary", "possible_considerations", "urgency")):
                return {**parsed, "source": "ai"}
        else:
            print(f"Groq API error {res.status_code} (health-insight): {res.text}")
    except Exception as e:
        print(f"AI health-insight failed, falling back: {e}")

    return fallback
# ===== Append this to routes/chat.py (after the /ask endpoint) =====
# Requires nothing new — uses the same GROQ_API_KEY, GROQ_URL, GROQ_MODEL,
# httpx, json, BaseModel, get_current_user already imported at the top.


class InsightRequest(BaseModel):
    symptoms: list[dict]  # [{"label": "Fever", "severity": "Moderate"}, ...]
    age: Optional[int] = None
    recovery_percent: Optional[float] = None


@router.post("/health-insight")
async def health_insight(payload: InsightRequest, user: dict = Depends(get_current_user)):
    """Looks at a patient's recent logged symptoms TOGETHER (not one at
    a time) and gives a plain-language insight about what pattern they
    might suggest — explicitly NOT a diagnosis, always pushes toward
    seeing a real doctor. This is the same category of feature as a
    WebMD/Ada symptom checker: informational only, heavily disclaimed."""

    if not payload.symptoms:
        raise HTTPException(status_code=400, detail="No symptoms to analyze yet.")

    symptom_lines = ", ".join(
        f'{s.get("label", "Unknown")} ({s.get("severity", "Mild")})' for s in payload.symptoms[-10:]
    )

    fallback = {
        "summary": "Not enough information for an AI-generated insight right now. Please share these symptoms with your doctor directly.",
        "possible_considerations": [],
        "urgency": "routine",
        "source": "fallback",
    }

    if not GROQ_API_KEY:
        return fallback

    prompt = (
        f"A patient (age: {payload.age or 'unknown'}, recovery progress: "
        f"{payload.recovery_percent if payload.recovery_percent is not None else 'unknown'}%) "
        f"has logged these recent symptoms together: {symptom_lines}. "
        'Respond with ONLY valid JSON, no extra text, in exactly this shape: '
        '{"summary": "one or two plain-language sentences about what this symptom pattern '
        'could be related to, written for a non-medical person", '
        '"possible_considerations": ["short phrase 1", "short phrase 2", "short phrase 3"], '
        '"urgency": "routine" or "soon" or "urgent"}. '
        "IMPORTANT RULES: Never state a definite diagnosis. possible_considerations must be "
        "general categories (e.g. \"viral infection\", \"dehydration\"), not confident claims. "
        'Set urgency to "urgent" if symptoms suggest something potentially serious '
        "(e.g. chest pain, severe breathing difficulty, high fever with confusion), "
        '"soon" if it warrants a doctor visit within a few days, otherwise "routine".'
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are a cautious medical information assistant. You NEVER diagnose. "
                                "You only describe general possible considerations and always encourage "
                                "professional medical evaluation."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 300,
                    "response_format": {"type": "json_object"},
                },
            )
        if res.status_code == 200:
            content = res.json()["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            if all(k in parsed for k in ("summary", "possible_considerations", "urgency")):
                return {**parsed, "source": "ai"}
        else:
            print(f"Groq API error {res.status_code} (health-insight): {res.text}")
    except Exception as e:
        print(f"AI health-insight failed, falling back: {e}")

    return fallback
# ===== Append this to routes/chat.py (after health-insight endpoint) =====
# Uses the same imports already present in chat.py.


class CaseSummaryRequest(BaseModel):
    patient_name: str
    age: Optional[int] = None
    recovery_percent: Optional[float] = None
    risk_level: Optional[str] = None
    medicine_adherence: Optional[float] = None
    symptoms: list[dict] = []          # [{"label": "Fever", "severity": "Moderate", "logged_at": "..."}]
    weekly_snapshots: list[dict] = []  # [{"week": 1, "recovery_percent": 60, "risk_level": "Medium", ...}]


@router.post("/case-summary")
async def case_summary(payload: CaseSummaryRequest, user: dict = Depends(get_current_user)):
    """Generates a short natural-language case summary for a doctor —
    like a colleague briefing them before they open the chart. Pulls
    together recovery trend, symptom pattern, and adherence into one
    readable paragraph instead of making the doctor piece it together
    from raw numbers."""

    if user["role"] not in ("Doctor", "Admin"):
        raise HTTPException(status_code=403, detail="Only doctors and admins can view case summaries.")

    fallback = {
        "summary": f"{payload.patient_name} is currently at {payload.recovery_percent or 0}% recovery "
                   f"with {payload.risk_level or 'Low'} risk. Review the symptom log and recovery chart for details.",
        "source": "fallback",
    }

    if not GROQ_API_KEY:
        return fallback

    recent_symptoms = ", ".join(
        f'{s.get("label","?")} ({s.get("severity","?")})' for s in payload.symptoms[-8:]
    ) or "none logged"

    trend = ", ".join(
        f'Week {w.get("week")}: {w.get("recovery_percent")}% recovery, {w.get("risk_level")} risk'
        for w in payload.weekly_snapshots[-4:]
    ) or "no weekly snapshots yet"

    prompt = (
        f"Patient: {payload.patient_name}, age {payload.age or 'unknown'}. "
        f"Current recovery: {payload.recovery_percent or 'unknown'}%. "
        f"Current risk level: {payload.risk_level or 'unknown'}. "
        f"Medicine adherence: {round((payload.medicine_adherence or 0) * 100)}%. "
        f"Recent symptoms logged: {recent_symptoms}. "
        f"Weekly recovery trend: {trend}. "
        "Write a 3-4 sentence case briefing for the treating doctor, in plain professional "
        "language, highlighting the overall trend (improving/stable/worsening), anything that "
        "needs attention, and one suggested next step. Do not repeat raw numbers excessively — "
        "synthesize them into insight. No markdown, no bullet points, just flowing text."
    )

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a clinical assistant writing brief, professional case "
                                       "briefings for doctors. Be concise, factual, and clear.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 220,
                },
            )
        if res.status_code == 200:
            text = res.json()["choices"][0]["message"]["content"].strip()
            if text:
                return {"summary": text, "source": "ai"}
        else:
            print(f"Groq API error {res.status_code} (case-summary): {res.text}")
    except Exception as e:
        print(f"AI case-summary failed, falling back: {e}")

    return fallback
# ===== Append this to routes/chat.py =====

class DischargeSummaryRequest(BaseModel):
    patient_name: str
    age: Optional[int] = None
    recovery_percent: Optional[float] = None
    risk_level: Optional[str] = None
    medicine_adherence: Optional[float] = None
    symptoms: list[dict] = []
    medicines: list[dict] = []
    weekly_snapshots: list[dict] = []
    doctor_notes: Optional[str] = ""


@router.post("/discharge-summary")
async def discharge_summary(payload: DischargeSummaryRequest, user: dict = Depends(get_current_user)):
    """Generates a professional discharge summary draft for a doctor to
    review and edit before sharing with the patient."""

    if user["role"] not in ("Doctor", "Admin"):
        raise HTTPException(status_code=403, detail="Only doctors can generate discharge summaries.")

    fallback_text = f"""DISCHARGE SUMMARY

Patient: {payload.patient_name}
Age: {payload.age or 'N/A'}
Final Recovery: {payload.recovery_percent or 'N/A'}%
Risk Level at Discharge: {payload.risk_level or 'N/A'}
Medicine Adherence: {round((payload.medicine_adherence or 0) * 100)}%

Symptoms Reported: {', '.join(s.get('label','?') for s in payload.symptoms) or 'None'}

Current Medicines: {', '.join(m.get('name','?') for m in payload.medicines) or 'None'}

Doctor's Notes: {payload.doctor_notes or 'N/A'}

Please follow up with your doctor as advised."""

    if not GROQ_API_KEY:
        return {"summary": fallback_text, "source": "fallback"}

    symptom_list = ", ".join(f'{s.get("label","?")} ({s.get("severity","?")})' for s in payload.symptoms) or "none"
    medicine_list = ", ".join(m.get("name", "?") for m in payload.medicines) or "none"
    trend = ", ".join(f'Week {w.get("week")}: {w.get("recovery_percent")}%' for w in payload.weekly_snapshots[-4:]) or "no weekly data"

    prompt = (
        f"Write a professional hospital discharge summary for the following patient.\n\n"
        f"Patient: {payload.patient_name}, Age: {payload.age or 'unknown'}\n"
        f"Final recovery: {payload.recovery_percent or 'unknown'}%, Risk: {payload.risk_level or 'unknown'}\n"
        f"Medicine adherence: {round((payload.medicine_adherence or 0) * 100)}%\n"
        f"Symptoms during stay: {symptom_list}\n"
        f"Medicines prescribed: {medicine_list}\n"
        f"Recovery trend: {trend}\n"
        f"Doctor's additional notes: {payload.doctor_notes or 'none'}\n\n"
        "Format it as a clean professional discharge summary with these sections:\n"
        "1. Patient Information\n"
        "2. Summary of Condition\n"
        "3. Treatment & Medicines\n"
        "4. Recovery Progress\n"
        "5. Discharge Instructions\n"
        "6. Follow-up Recommendations\n\n"
        "Keep it concise, professional, and patient-friendly. Plain text, no markdown."
    )

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            res = await client.post(
                GROQ_URL,
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": "You are a medical professional writing discharge summaries. Be clear, professional, and compassionate."},
                        {"role": "user", "content": prompt},
                    ],
                    "max_tokens": 600,
                },
            )
        if res.status_code == 200:
            text = res.json()["choices"][0]["message"]["content"].strip()
            if text:
                return {"summary": text, "source": "ai"}
        else:
            print(f"Groq API error {res.status_code} (discharge-summary): {res.text}")
    except Exception as e:
        print(f"AI discharge-summary failed: {e}")

    return {"summary": fallback_text, "source": "fallback"}