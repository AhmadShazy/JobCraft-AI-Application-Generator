import os
from motor.motor_asyncio import AsyncIOMotorClient

# Fetch configs from environment variables loaded in main.py
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "jobcraft_db")

# Global DB Client reference
db_client: AsyncIOMotorClient = None

def get_database():
    """
    Returns the initialized MongoDB database reference.
    Raises RuntimeError if connection has not been initialized.
    """
    if db_client is None:
        raise RuntimeError("Database connection not initialized. Lifespan event must run.")
    return db_client[DB_NAME]

async def connect_to_mongo():
    """Initializes the MongoDB connection pool and configures database rules."""
    global db_client
    print(f"[mongodb] Connecting to MongoDB at {MONGO_URI}...")
    db_client = AsyncIOMotorClient(MONGO_URI)
    
    # Verify connection by pinging
    await db_client.admin.command('ping')
    print("[mongodb] MongoDB connection verified successfully.")

    # Access database and configure schema indexes
    db = db_client[DB_NAME]
    
    # Enforce unique index on users' email addresses
    await db.users.create_index("email", unique=True)
    print("[mongodb] Unique index on users.email ensured.")

async def close_mongo_connection():
    """Closes the MongoDB connection pool."""
    global db_client
    if db_client:
        db_client.close()
        print("[mongodb] MongoDB connection closed.")
