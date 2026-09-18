from motor.motor_asyncio import AsyncIOMotorClient

from backend import config

MONGO_URI = config.MONGO_URI
DB_NAME = config.DB_NAME

# Global DB client reference. Stays None until a ping has actually succeeded, so
# get_database() never hands out a half-initialised client that would make every
# request hang on a server-selection timeout.
db_client: AsyncIOMotorClient = None
_connected: bool = False


def get_database():
    """
    Returns the initialized MongoDB database reference.
    Raises RuntimeError if the connection has not been established.
    """
    if db_client is None or not _connected:
        raise RuntimeError("Database connection not initialized. Lifespan event must run.")
    return db_client[DB_NAME]


def is_connected() -> bool:
    """Whether a verified Mongo connection is currently available (for /health)."""
    return _connected


async def connect_to_mongo():
    """Initializes the MongoDB connection pool and configures indexes. Raises on failure."""
    global db_client, _connected
    print(f"[mongodb] Connecting to MongoDB at {MONGO_URI}...")

    # Build the client locally and only publish it to the module global once the
    # ping succeeds. A failed ping therefore leaves db_client as None, so
    # get_database() raises a clear error instead of hanging.
    client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    await client.admin.command("ping")

    db_client = client
    _connected = True
    print("[mongodb] MongoDB connection verified successfully.")

    db = client[DB_NAME]

    # Enforce unique email addresses.
    await db.users.create_index("email", unique=True)
    # Verification link lookups (public, unauthenticated, hit on every click).
    await db.users.create_index("email_verification_token", sparse=True)
    # Password-reset link lookups.
    await db.users.create_index("password_reset_token", sparse=True)
    # Session lookups by embedded session id (device management, refresh).
    await db.users.create_index("sessions.sid", sparse=True)
    # History reads: filtered by user and sorted newest-first.
    await db.history.create_index([("user_id", 1), ("created_at", -1)])
    print("[mongodb] Indexes ensured.")


async def close_mongo_connection():
    """Closes the MongoDB connection pool."""
    global db_client, _connected
    if db_client:
        db_client.close()
        _connected = False
        print("[mongodb] MongoDB connection closed.")
