"""
Shared pytest fixtures.

Environment is configured HERE, before any `backend.*` module is imported, so
backend.config reads these test values (and, critically, a real JWT secret rather
than the placeholder). Tests talk to a throwaway MongoDB database via a real motor
client, pointed at MONGO_URI (default local mongod, or the CI service container).
"""

import os

# Must run before backend.config is imported anywhere.
os.environ.setdefault("APP_ENV", "development")
os.environ.setdefault("COOKIE_SECURE", "false")   # so httpx over http:// resends cookies
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("JWT_SECRET", "unit-test-secret-value-not-the-placeholder-000000")
os.environ.setdefault("MONGO_URI", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "jobcraft_pytest")
os.environ.setdefault("GEMINI_API_KEY", "DummyKeyForTests")
os.environ.setdefault("RESEND_API_KEY", "placeholder_re_123456789")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

import httpx
import pytest
import pytest_asyncio
from motor.motor_asyncio import AsyncIOMotorClient

import backend.database as database
import backend.limiter as limiter_mod
import backend.main as main

# All tests share one client IP, so the per-IP auth limits would otherwise trip
# across tests. Disable rate limiting globally for the suite (limits are exercised
# separately where needed).
limiter_mod.limiter.enabled = False


@pytest_asyncio.fixture
async def client():
    """An httpx AsyncClient bound to the app, backed by a freshly-dropped test DB."""
    mongo = AsyncIOMotorClient(os.environ["MONGO_URI"])
    database.db_client = mongo
    database._connected = True

    await mongo.drop_database(database.DB_NAME)
    await mongo[database.DB_NAME].users.create_index("email", unique=True)

    transport = httpx.ASGITransport(app=main.app)
    async with httpx.AsyncClient(
        transport=transport,
        base_url="http://test",
        headers={"user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/120"},
    ) as c:
        yield c

    await mongo.drop_database(database.DB_NAME)
    mongo.close()


async def signup(client, email="user@example.com", password="abcd1234"):
    return await client.post("/auth/signup", json={"email": email, "password": password})
