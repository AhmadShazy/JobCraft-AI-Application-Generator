import os
import re
import secrets
import resend
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
from backend.dependencies import get_current_user, get_authenticated_user
from pydantic import BaseModel, EmailStr
from backend.auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, set_auth_cookies, clear_auth_cookies
)
from backend.database import get_database
from backend.limiter import limiter

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

async def send_verification_email_helper(user_id: str, email: str) -> str:
    db = get_database()
    token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(hours=24)
    
    from bson import ObjectId
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "email_verification_token": token,
                "email_verification_token_expires": expiry
            }
        }
    )
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
    verification_url = f"{frontend_url}/verify-email?token={token}"
    
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key or "your_resend_api_key" in api_key or "re_123456789" in api_key:
        print(f"\n[resend bypass] Resend API key is not configured. Verification URL:\n{verification_url}\n")
        return verification_url
        
    try:
        resend.api_key = api_key
        html_content = f"""<!DOCTYPE html>
<html>
<head>
  <style>
    body {{ font-family: Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }}
    .container {{ max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    h1 {{ color: #0891b2; font-size: 24px; font-weight: bold; margin-bottom: 16px; text-align: center; }}
    p {{ font-size: 16px; line-height: 24px; margin-bottom: 24px; text-align: center; color: #475569; }}
    .btn-container {{ text-align: center; margin-bottom: 24px; }}
    .btn {{ display: inline-block; background-color: #06b6d4; color: #ffffff !important; font-weight: bold; font-size: 16px; padding: 12px 24px; border-radius: 8px; text-decoration: none; text-align: center; }}
    .btn:hover {{ background-color: #0891b2; }}
    .fallback {{ font-size: 12px; color: #94a3b8; text-align: center; word-break: break-all; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
    .fallback a {{ color: #06b6d4; text-decoration: underline; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>JobCraft AI</h1>
    <p>Please verify your email address to secure your account and enable full access.</p>
    <div class="btn-container">
      <a href="{verification_url}" class="btn" target="_blank">Verify Email Address</a>
    </div>
    <div class="fallback">
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="{verification_url}">{verification_url}</a>
    </div>
  </div>
</body>
</html>"""
        
        resend.Emails.send({
            "from": os.getenv("RESEND_FROM", "onboarding@resend.dev"),
            "to": email,
            "subject": "Verify your email address - JobCraft AI",
            "html": html_content
        })
        return verification_url
    except Exception as e:
        print(f"[resend ERROR] Failed to send verification email: {e}")
        print(f"[fallback log] Verification URL: {verification_url}")
        raise e

@router.post("/signup")
@limiter.limit("5/15 minutes")
async def signup(request: Request, payload: SignupRequest, response: Response):
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
        "email_verification_token": None,
        "email_verification_token_expires": None,
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
    
    # 5. Automatically send verification email on registration
    try:
        await send_verification_email_helper(user_id, email_normalized)
    except Exception as e:
        print(f"[signup verification warning] Could not send verification email during signup: {e}")
    
    set_auth_cookies(response, access_token, refresh_token)
    return {"status": "ok", "message": "User registered and logged in successfully. Verification email sent."}

@router.post("/login")
@limiter.limit("10/15 minutes")
async def login(request: Request, payload: LoginRequest, response: Response):
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

@router.post("/send-verification")
@limiter.limit("3/hour")
async def send_verification(request: Request, current_user: dict = Depends(get_authenticated_user)):
    db = get_database()
    
    # 1. Check if user is already verified
    if current_user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your email is already verified."
        )
        
    try:
        await send_verification_email_helper(current_user["_id"], current_user["email"])
        return {
            "status": "ok",
            "message": "Verification email sent. Check your inbox."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email via Resend: {str(e)}"
        )

@router.get("/verify-email")
async def verify_email(token: str):
    db = get_database()
    
    # 1. Lookup user by token
    user = await db.users.find_one({"email_verification_token": token})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link."
        )
        
    # 2. Check token expiration
    expires = user.get("email_verification_token_expires")
    if expires:
        # Check if expires is naive or aware
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link has expired. Please request a new one."
            )
            
    # 3. Mark as verified
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "email_verified": True,
                "email_verification_token": None,
                "email_verification_token_expires": None
            }
        }
    )
    
    return {
        "status": "ok",
        "message": "Email verified successfully."
    }

