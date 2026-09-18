import re
import secrets
from datetime import datetime, timezone, timedelta

import resend
from bson import ObjectId
from fastapi import APIRouter, Response, Request, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr

from backend import config
from backend.auth import (
    hash_password, verify_password, dummy_password_verify,
    create_access_token, create_refresh_token,
    decode_token, set_auth_cookies, clear_auth_cookies,
    new_session_id, hash_token, parse_device,
)
from backend.database import get_database
from backend.dependencies import get_authenticated_user
from backend.limiter import limiter, get_client_ip

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Cap on concurrent sessions (devices) retained per account. When exceeded, the
# least-recently-used session is dropped, signing that device out.
MAX_SESSIONS_PER_USER = 10

# Generic credential error — identical for unknown email and wrong password so the
# response does not disclose which accounts exist.
_INVALID_CREDENTIALS = "Invalid email or password."


# ─────────────────────────────────────────────
# Request schemas
# ─────────────────────────────────────────────
class SignupRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────
def validate_password_strength(password: str):
    """Enforce minimum 8 characters and at least one number."""
    if len(password) < 8 or not re.search(r"\d", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters and include one number.",
        )


def _build_session(sid: str, refresh_token: str, request: Request) -> dict:
    ua = request.headers.get("user-agent", "")
    now = datetime.now(timezone.utc)
    return {
        "sid": sid,
        "refresh_hash": hash_token(refresh_token),
        "device": parse_device(ua),
        "user_agent": ua[:300],
        "ip": get_client_ip(request),
        "created_at": now,
        "last_used_at": now,
    }


async def _register_session(db, user_object_id: ObjectId, session: dict):
    """Append a session and cap the list to the most-recently-used MAX_SESSIONS_PER_USER."""
    await db.users.update_one(
        {"_id": user_object_id},
        {
            "$push": {
                "sessions": {
                    "$each": [session],
                    "$sort": {"last_used_at": -1},
                    "$slice": MAX_SESSIONS_PER_USER,
                }
            },
            # Retire the legacy single-session field if present.
            "$unset": {"active_refresh_token": ""},
        },
    )


def _send_email(to: str, subject: str, html: str) -> None:
    """Send an email via Resend, or print a bypass line when no real key is configured."""
    if not config.resend_is_configured():
        print(f"\n[resend bypass] Resend not configured. Would send '{subject}' to {to}.\n")
        return
    resend.api_key = config.RESEND_API_KEY
    resend.Emails.send({
        "from": config.RESEND_FROM,
        "to": to,
        "subject": subject,
        "html": html,
    })


def _email_shell(heading: str, body: str, button_label: str, url: str) -> str:
    return f"""<!DOCTYPE html>
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
    <h1>{heading}</h1>
    <p>{body}</p>
    <div class="btn-container">
      <a href="{url}" class="btn" target="_blank">{button_label}</a>
    </div>
    <div class="fallback">
      If the button above doesn't work, copy and paste this link into your browser:<br>
      <a href="{url}">{url}</a>
    </div>
  </div>
</body>
</html>"""


async def send_verification_email_helper(user_id: str, email: str) -> None:
    db = get_database()
    token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(hours=24)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "email_verification_token": token,
            "email_verification_token_expires": expiry,
        }},
    )
    frontend_url = config.FRONTEND_URL.split(",")[0].strip().rstrip("/")
    verification_url = f"{frontend_url}/verify-email?token={token}"
    html = _email_shell(
        "JobCraft AI",
        "Please verify your email address to secure your account and enable full access.",
        "Verify Email Address",
        verification_url,
    )
    _send_email(email, "Verify your email address - JobCraft AI", html)


async def send_password_reset_email_helper(user_id: str, email: str) -> None:
    db = get_database()
    token = secrets.token_urlsafe(32)
    expiry = datetime.now(timezone.utc) + timedelta(minutes=config.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {
            "password_reset_token": token,
            "password_reset_token_expires": expiry,
        }},
    )
    frontend_url = config.FRONTEND_URL.split(",")[0].strip().rstrip("/")
    reset_url = f"{frontend_url}/reset-password?token={token}"
    html = _email_shell(
        "Reset your password",
        "We received a request to reset your JobCraft AI password. This link expires in "
        f"{config.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes. If you did not request it, you can ignore this email.",
        "Reset Password",
        reset_url,
    )
    _send_email(email, "Reset your password - JobCraft AI", html)


def _sanitize_session(session: dict, current_sid: str) -> dict:
    return {
        "sid": session.get("sid"),
        "device": session.get("device", "Unknown device"),
        "ip": session.get("ip", ""),
        "created_at": session.get("created_at").isoformat() if isinstance(session.get("created_at"), datetime) else None,
        "last_used_at": session.get("last_used_at").isoformat() if isinstance(session.get("last_used_at"), datetime) else None,
        "current": session.get("sid") == current_sid,
    }


# ─────────────────────────────────────────────
# Auth lifecycle
# ─────────────────────────────────────────────
@router.post("/signup")
@limiter.limit("5/15 minutes")
async def signup(request: Request, payload: SignupRequest, response: Response):
    db = get_database()

    email_normalized = payload.email.strip().lower()
    existing_user = await db.users.find_one({"email": email_normalized})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in.",
        )

    validate_password_strength(payload.password)

    hashed_pwd = hash_password(payload.password)
    new_user = {
        "email": email_normalized,
        "password_hash": hashed_pwd,
        "email_verified": False,
        "email_verification_token": None,
        "email_verification_token_expires": None,
        "password_reset_token": None,
        "password_reset_token_expires": None,
        "created_at": datetime.now(timezone.utc),
        "profile_complete": False,
        "profile": {},
        "sessions": [],
    }
    insert_result = await db.users.insert_one(new_user)
    user_id = str(insert_result.inserted_id)

    sid = new_session_id()
    access_token = create_access_token(user_id, email_normalized, sid)
    refresh_token = create_refresh_token(user_id, sid)
    await _register_session(db, insert_result.inserted_id, _build_session(sid, refresh_token, request))

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

    user = await db.users.find_one({"email": email_normalized})
    if not user:
        # Spend an equivalent bcrypt verification so timing does not reveal that
        # the account does not exist, and return the same message as a bad password.
        dummy_password_verify()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS)
    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS)

    user_id = str(user["_id"])
    sid = new_session_id()
    access_token = create_access_token(user_id, email_normalized, sid)
    refresh_token = create_refresh_token(user_id, sid)
    await _register_session(db, user["_id"], _build_session(sid, refresh_token, request))

    set_auth_cookies(response, access_token, refresh_token)
    return {"status": "ok", "message": "Login successful."}


@router.post("/logout")
async def logout(request: Request, response: Response):
    """
    Ends the current session. Keys off the refresh_token cookie first (long-lived,
    so it still identifies the session even after the access token has expired),
    falling back to the access token. Removing the session revokes both tokens.
    """
    db = get_database()
    token = request.cookies.get("refresh_token") or request.cookies.get("access_token")
    if token:
        try:
            payload = decode_token(token)
            user_id = payload.get("sub")
            sid = payload.get("sid")
            if user_id and sid:
                await db.users.update_one(
                    {"_id": ObjectId(user_id)},
                    {"$pull": {"sessions": {"sid": sid}}},
                )
        except Exception:
            pass  # Best-effort; always clear cookies regardless.

    clear_auth_cookies(response)
    return {"status": "ok", "message": "Logout successful."}


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    db = get_database()
    ref_token = request.cookies.get("refresh_token")
    if not ref_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing. Please log in again.",
        )

    try:
        payload = decode_token(ref_token)
    except Exception:
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired or invalid. Please log in again.",
        )

    # Checked outside the decode try/except so this 401 is actually reachable
    # (previously it was raised inside the try and swallowed by the bare except).
    if payload.get("type") != "refresh":
        clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type.")

    user_id = payload.get("sub")
    sid = payload.get("sid")

    user = await db.users.find_one({"_id": ObjectId(user_id)}) if user_id else None
    if not user:
        clear_auth_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User session not found.")

    session = next((s for s in user.get("sessions", []) if s.get("sid") == sid), None)
    if not session:
        # Session was logged out or revoked (or predates the sessions model).
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or signed out. Please log in again.",
        )

    if session.get("refresh_hash") != hash_token(ref_token):
        # A refresh token was replayed after it had already been rotated: treat as
        # theft and revoke this whole session.
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$pull": {"sessions": {"sid": sid}}},
        )
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Security warning: Session reused. Please log in again.",
        )

    # Valid -> rotate the refresh token, keep the same session id so the device
    # stays the same in the management list.
    access_token = create_access_token(user_id, user["email"], sid)
    new_refresh_token = create_refresh_token(user_id, sid)
    await db.users.update_one(
        {"_id": user["_id"], "sessions.sid": sid},
        {"$set": {
            "sessions.$.refresh_hash": hash_token(new_refresh_token),
            "sessions.$.last_used_at": datetime.now(timezone.utc),
            "sessions.$.ip": get_client_ip(request),
        }},
    )

    set_auth_cookies(response, access_token, new_refresh_token)
    return {"status": "ok", "message": "Tokens refreshed successfully."}


# ─────────────────────────────────────────────
# Email verification
# ─────────────────────────────────────────────
@router.post("/send-verification")
@limiter.limit("3/hour")
async def send_verification(request: Request, current_user: dict = Depends(get_authenticated_user)):
    if current_user.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your email is already verified.",
        )
    try:
        await send_verification_email_helper(current_user["_id"], current_user["email"])
        return {"status": "ok", "message": "Verification email sent. Check your inbox."}
    except Exception as e:
        # Never surface the raw provider error (it can carry key/account state).
        print(f"[resend ERROR] Failed to send verification email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not send the verification email right now. Please try again later.",
        )


@router.get("/verify-email")
async def verify_email(token: str):
    db = get_database()

    user = await db.users.find_one({"email_verification_token": token})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification link.",
        )

    expires = user.get("email_verification_token_expires")
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification link has expired. Please request a new one.",
            )

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "email_verified": True,
            "email_verification_token": None,
            "email_verification_token_expires": None,
        }},
    )
    return {"status": "ok", "message": "Email verified successfully."}


# ─────────────────────────────────────────────
# Password reset
# ─────────────────────────────────────────────
@router.post("/forgot-password")
@limiter.limit("3/hour")
async def forgot_password(request: Request, payload: ForgotPasswordRequest):
    """Always returns the same response whether or not the account exists (no enumeration)."""
    db = get_database()
    email_normalized = payload.email.strip().lower()
    user = await db.users.find_one({"email": email_normalized})
    if user:
        try:
            await send_password_reset_email_helper(str(user["_id"]), email_normalized)
        except Exception as e:
            print(f"[resend ERROR] Failed to send password reset email: {e}")
    return {
        "status": "ok",
        "message": "If an account exists for that email, a password reset link has been sent.",
    }


@router.post("/reset-password")
@limiter.limit("5/hour")
async def reset_password(request: Request, payload: ResetPasswordRequest, response: Response):
    db = get_database()
    user = await db.users.find_one({"password_reset_token": payload.token})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset link.",
        )

    expires = user.get("password_reset_token_expires")
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset link has expired. Please request a new one.",
            )

    validate_password_strength(payload.password)

    # Set the new password and, for security, sign out every existing session so a
    # thief who triggered the reset (or held old tokens) is fully evicted.
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": hash_password(payload.password),
                "password_reset_token": None,
                "password_reset_token_expires": None,
                "sessions": [],
            }
        },
    )
    clear_auth_cookies(response)
    return {"status": "ok", "message": "Password updated. Please log in with your new password."}


# ─────────────────────────────────────────────
# Device / session management
# ─────────────────────────────────────────────
@router.get("/sessions")
async def list_sessions(current_user: dict = Depends(get_authenticated_user)):
    """List the account's active sessions (devices), newest activity first."""
    current_sid = current_user.get("_sid")
    sessions = current_user.get("sessions", [])
    sanitized = [_sanitize_session(s, current_sid) for s in sessions]
    sanitized.sort(key=lambda s: s.get("last_used_at") or "", reverse=True)
    return {"sessions": sanitized}


@router.delete("/sessions/{sid}")
async def revoke_session(sid: str, response: Response, current_user: dict = Depends(get_authenticated_user)):
    """Sign out a specific device. Removing a session revokes its access + refresh tokens immediately."""
    db = get_database()
    result = await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$pull": {"sessions": {"sid": sid}}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")

    # If the user revoked the session they are currently on, clear their cookies too.
    if sid == current_user.get("_sid"):
        clear_auth_cookies(response)
    return {"status": "ok", "message": "Device signed out."}


@router.post("/sessions/revoke-others")
async def revoke_other_sessions(current_user: dict = Depends(get_authenticated_user)):
    """Sign out every device except the current one."""
    db = get_database()
    current_sid = current_user.get("_sid")
    result = await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$pull": {"sessions": {"sid": {"$ne": current_sid}}}},
    )
    return {"status": "ok", "message": "Other devices signed out.", "revoked": result.modified_count}
