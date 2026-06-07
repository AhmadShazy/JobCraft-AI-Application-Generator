from fastapi import Request, HTTPException, status
from bson import ObjectId
import jwt
from backend.auth import decode_token
from backend.database import get_database

async def get_authenticated_user(request: Request) -> dict:
    """
    FastAPI dependency that reads the access_token from cookies,
    verifies it, and returns the current user from MongoDB.
    Does not enforce email verification checks.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token missing. Please log in.",
        )
    
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type.",
            )
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload.",
            )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token expired. Please refresh your token.",
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token.",
        )

    db = get_database()
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format.",
        )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session not found.",
        )
        
    # Convert _id to string for downstream handler convenience
    user["_id"] = str(user["_id"])
    return user


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that checks if the user is authenticated
    AND checks if the user is email verified.
    """
    user = await get_authenticated_user(request)
    if not user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before continuing.",
        )
    return user
