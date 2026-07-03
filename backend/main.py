from contextlib import asynccontextmanager
import asyncio
import httpx
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.mongodb import connect_db, close_db
from routes import auth, patients, predict, risk, chat, admin, appointments, notifications, messages, sos

BACKEND_URL = os.getenv("BACKEND_URL", "")


async def keep_alive():
    """Pings /health every 14 min to prevent Render free-tier cold starts."""
    if not BACKEND_URL:
        return
    await asyncio.sleep(60)
    while True:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.get(f"{BACKEND_URL}/health")
                print("Keep-alive ping sent.")
        except Exception as e:
            print(f"Keep-alive ping failed (non-critical): {e}")
        await asyncio.sleep(840)  # 14 minutes


@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_db()
    print("HealTrack AI backend starting — Mongo client initialized.")
    asyncio.create_task(keep_alive())
    yield
    close_db()


app = FastAPI(title="HealTrack AI", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(predict.router)
app.include_router(risk.router)
app.include_router(chat.router)
app.include_router(admin.router)
app.include_router(appointments.router)
app.include_router(notifications.router)
app.include_router(messages.router)
app.include_router(sos.router)


@app.get("/")
def home():
    return {"message": "HealTrack AI Backend Running"}


@app.get("/health")
def health():
    return {"status": "ok"}