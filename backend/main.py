from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.mongodb import connect_db, close_db
from routes import auth, patients, predict, risk, chat, admin, appointments
from routes import auth, patients, predict, risk, chat, admin, appointments, notifications
from routes import auth, patients, predict, risk, chat, admin, appointments, notifications, messages
from routes import auth, patients, predict, risk, chat, admin, appointments, notifications, messages, sos

@asynccontextmanager
async def lifespan(app: FastAPI):
    connect_db()
    print("HealTrack AI backend starting — Mongo client initialized.")
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