from fastapi import Request, HTTPException, status
from bson import ObjectId
import jwt

from backend.auth import decode_token
from backend.database import get_database


async def get_authenticated_user(request: Request) -> dict:
    """
    FastAPI dependency that reads the access_token cookie, verifies it, confirms
    its session is still active, and returns the current user document.
    Does not enforce email verification.
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

    # Session revocation: the access token carries a session id (sid). If that
    # session is no longer in the user's sessions list (logged out on this
    # device, revoked from another device, or invalidated by a password reset),
    # the token is dead immediately — this is what makes access tokens revocable
    # rather than valid until their 30-minute expiry.
    sid = payload.get("sid")
    active_sids = {s.get("sid") for s in user.get("sessions", [])}
    if not sid or sid not in active_sids:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or signed out. Please log in again.",
        )

    # Convey the active session id to handlers (used by device-management routes).
    user["_id"] = str(user["_id"])
    user["_sid"] = sid
    return user


async def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency that requires authentication AND a verified email address.
    """
    user = await get_authenticated_user(request)
    if not user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before continuing.",
        )
    return user
