import re
from datetime import datetime, timezone
from fastapi import APIRouter, Response, Request, HTTPException, status
from pydantic import BaseModel, EmailStr
from backend.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, set_auth_cookies, clear_auth_cookies
)
from backend.database import get_database

router = APIRouter(prefix="/auth", tags=["Authentication"])

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

def validate_password_strength(password: str):
    """Enforce minimum 8 characters and at least one number."""
    if len(password) < 8 or not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters and include one number."
        )

@router.post("/signup")
async def signup(payload: SignupRequest, response: Response):
    db = get_database()
    
    # 1. Normalize and check if email is taken
    email_normalized = payload.email.strip().lower()
    existing_user = await db.users.find_one({"email": email_normalized})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in."
        )
        
    # 2. Validate password
    validate_password_strength(payload.password)
    
    # 3. Hash password and insert user
    hashed_pwd = hash_password(payload.password)
    new_user = {
        "email": email_normalized,
        "password_hash": hashed_pwd,
        "email_verified": False,
        "created_at": datetime.now(timezone.utc),
        "profile_complete": False,
        "profile": {},
        "active_refresh_token": None
    }
    
    insert_result = await db.users.insert_one(new_user)
    user_id = str(insert_result.inserted_id)
    
    # 4. Generate tokens and apply rotation storage
    access_token = create_access_token(user_id, email_normalized)
    refresh_token = create_refresh_token(user_id)
    
    await db.users.update_one(
        {"_id": insert_result.inserted_id},
        {"$set": {"active_refresh_token": refresh_token}}
    )
    
    set_auth_cookies(response, access_token, refresh_token)
    return {"status": "ok", "message": "User registered and logged in successfully."}

@router.post("/login")
async def login(payload: LoginRequest, response: Response):
    db = get_database()
    email_normalized = payload.email.strip().lower()
    
    # 1. Fetch user
    user = await db.users.find_one({"email": email_normalized})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email. Please sign up."
        )
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password. Please try again."
        )
        
    user_id = str(user["_id"])
    
    # 2. Generate tokens and update active refresh token
    access_token = create_access_token(user_id, email_normalized)
    refresh_token = create_refresh_token(user_id)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"active_refresh_token": refresh_token}}
    )
    
    set_auth_cookies(response, access_token, refresh_token)
    return {"status": "ok", "message": "Login successful."}

@router.post("/logout")
async def logout(request: Request, response: Response):
    # Retrieve token if present to clean up database state
    db = get_database()
    token = request.cookies.get("access_token")
    if token:
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            from bson import ObjectId
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"active_refresh_token": None}}
            )
        except Exception:
            pass  # Suppress errors on logout
            
    clear_auth_cookies(response)
    return {"status": "ok", "message": "Logout successful."}

@router.post("/refresh")
async def refresh(request: Request, response: Response):
    db = get_database()
    ref_token = request.cookies.get("refresh_token")
    if not ref_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing. Please log in again."
        )
        
    try:
        payload = decode_token(ref_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type."
            )
        user_id = payload.get("sub")
    except Exception:
        # Invalid or expired token -> clear cookies and force login
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired or invalid. Please log in again."
        )
        
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User session not found."
        )
        
    # Reuse Detection / Token Rotation logic
    if user.get("active_refresh_token") != ref_token:
        # Threat detected (replayed/stolen refresh token):
        # Invalidate the session immediately by clearing the stored token.
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"active_refresh_token": None}}
        )
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Security warning: Session reused. Please log in again."
        )
        
    # Valid refresh token -> issue rotated pair
    access_token = create_access_token(user_id, user["email"])
    new_refresh_token = create_refresh_token(user_id)
    
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"active_refresh_token": new_refresh_token}}
    )
    
    set_auth_cookies(response, access_token, new_refresh_token)
    return {"status": "ok", "message": "Tokens refreshed successfully."}
