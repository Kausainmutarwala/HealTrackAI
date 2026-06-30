import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "healtrack_ai")

_client: AsyncIOMotorClient | None = None
_db = None


def connect_db():
    """Called once on FastAPI startup. Doesn't raise — if Mongo is
    unreachable, routes that need it will fail individually instead of
    crashing the whole app (useful on demo day with a flaky connection)."""
    global _client, _db
    _client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=4000)
    _db = _client[MONGO_DB_NAME]
    return _db


def close_db():
    global _client
    if _client:
        _client.close()


def get_db():
    """Dependency-style accessor used by routes."""
    if _db is None:
        raise RuntimeError("Database not initialized. Did the app start up correctly?")
    return _db


# Convenience collection getters
def users_collection():
    return get_db()["users"]


def patients_collection():
    return get_db()["patients"]


def alerts_collection():
    return get_db()["alerts"]
