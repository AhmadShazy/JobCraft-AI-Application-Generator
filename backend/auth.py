import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import jwt
import bcrypt

from backend import config

# All auth configuration is sourced from backend.config, whose import runs
# load_dotenv() first. Reading these here (rather than os.getenv at this module's
# scope) is what guarantees the real secret is loaded before it is used.
JWT_SECRET = config.JWT_SECRET
JWT_ALGORITHM = config.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = config.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = config.REFRESH_TOKEN_EXPIRE_DAYS


def hash_password(password: str) -> str:
    """Return the bcrypt hash of a plain text password."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify if a plain text password matches a bcrypt hash."""
    pwd_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    try:
        return bcrypt.checkpw(pwd_bytes, hashed_bytes)
    except Exception:
        return False


# A pre-computed bcrypt hash of a random string, used to spend a constant amount
# of time verifying a password even when the account does not exist. This closes
# the timing side-channel that would otherwise let an attacker distinguish
# "no such email" (fast) from "wrong password" (slow bcrypt).
_DUMMY_PASSWORD_HASH = bcrypt.hashpw(b"timing-attack-mitigation", bcrypt.gensalt()).decode("utf-8")


def dummy_password_verify() -> None:
    """Burn a bcrypt verification so the unknown-email path costs the same as the known-email path."""
    try:
        bcrypt.checkpw(b"timing-attack-mitigation", _DUMMY_PASSWORD_HASH.encode("utf-8"))
    except Exception:
        pass


def new_session_id() -> str:
    """Generate an opaque session identifier embedded in a token pair."""
    return str(uuid.uuid4())


def hash_token(token: str) -> str:
    """SHA-256 of a JWT, stored server-side so a leaked DB never exposes usable refresh tokens."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user_id: str, email: str, sid: str) -> str:
    """Generate a short-lived JWT access token bound to a session id."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "email": email,
        "sid": sid,
        "exp": expire,
        "type": "access",
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str, sid: str) -> str:
    """Generate a long-lived JWT refresh token bound to a session id."""
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id,
        "sid": sid,
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode a JWT token. Raises ExpiredSignatureError or PyJWTError on failure."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def parse_device(user_agent: str) -> str:
    """Best-effort human-readable device label from a User-Agent string (dependency-free)."""
    if not user_agent:
        return "Unknown device"
    ua = user_agent
    ua_l = ua.lower()

    if "edg/" in ua_l or "edga/" in ua_l or "edgios/" in ua_l:
        browser = "Edge"
    elif "opr/" in ua_l or "opera" in ua_l:
        browser = "Opera"
    elif "firefox" in ua_l:
        browser = "Firefox"
    elif "chrome" in ua_l or "crios" in ua_l:
        browser = "Chrome"
    elif "safari" in ua_l:
        browser = "Safari"
    else:
        browser = "Browser"

    if "windows" in ua_l:
        os_name = "Windows"
    elif "iphone" in ua_l or "ipad" in ua_l or "ios" in ua_l:
        os_name = "iOS"
    elif "android" in ua_l:
        os_name = "Android"
    elif "mac os" in ua_l or "macintosh" in ua_l:
        os_name = "macOS"
    elif "linux" in ua_l:
        os_name = "Linux"
    else:
        os_name = "Unknown OS"

    return f"{browser} on {os_name}"


def _cookie_kwargs() -> dict:
    return {
        "httponly": True,
        "secure": config.COOKIE_SECURE,
        "samesite": config.COOKIE_SAMESITE,
    }


def set_auth_cookies(response, access_token: str, refresh_token: str):
    """Set the HTTP-only auth cookies using the configured Secure/SameSite policy."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        **_cookie_kwargs(),
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        **_cookie_kwargs(),
    )


def clear_auth_cookies(response):
    """Delete the auth cookies. Attributes must match those used when setting them."""
    kwargs = _cookie_kwargs()
    # delete_cookie ignores httponly but honours secure/samesite for correct matching.
    response.delete_cookie("access_token", secure=kwargs["secure"], samesite=kwargs["samesite"])
    response.delete_cookie("refresh_token", secure=kwargs["secure"], samesite=kwargs["samesite"])
