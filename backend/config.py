"""
Central configuration for the JobCraft AI backend.

This module is the ONE place that loads the .env file, and it does so at import
time before any value is read. Every other backend module must read configuration
from here (``from backend import config``) rather than calling ``os.getenv`` at its
own module scope.

Why this matters: previously ``auth.py`` read ``JWT_SECRET`` at module import, but
the only ``load_dotenv()`` call lived in ``ai_client.py``, which ``main.py`` imported
*after* the auth chain. The result was that every token was signed and verified with
the public placeholder secret instead of the real one in .env. Funnelling all env
access through this module — whose first statement is ``load_dotenv()`` — makes that
class of ordering bug impossible.
"""

import os
from dotenv import load_dotenv

# Load .env into the process environment BEFORE reading a single setting below.
# This is the first thing that runs whenever any backend module is imported,
# because the auth/limiter/database modules all import this one.
load_dotenv()

_DEFAULT_JWT_SECRET = "default_secret_key_change_me_in_production"


def _get_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


# ── Environment ────────────────────────────────────────────────────────────
# APP_ENV is canonical, but the deployed Render service historically set `ENV`
# (=production), so accept it as a fallback to avoid a silent dev-mode CORS gap.
APP_ENV = (os.getenv("APP_ENV") or os.getenv("ENV") or "development").strip().lower()
IS_PRODUCTION = APP_ENV == "production"

# ── JWT / Auth ─────────────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", _DEFAULT_JWT_SECRET)
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
# Password-reset tokens are short-lived one-time links.
PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("PASSWORD_RESET_TOKEN_EXPIRE_MINUTES", "60"))

# ── Cookies ────────────────────────────────────────────────────────────────
# Defaults suit the current deployment (frontend and API share the
# ahmadsheraz.com registrable domain via the Vercel /api proxy, so the browser
# treats every request as same-origin and SameSite=Lax is sufficient). If the
# frontend is ever served from a genuinely different site than the API, set
# COOKIE_SAMESITE=none (which requires COOKIE_SECURE=true).
COOKIE_SECURE = _get_bool("COOKIE_SECURE", True)
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").strip().lower()  # lax | strict | none

# ── Database ───────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "jobcraft_db")

# ── CORS ───────────────────────────────────────────────────────────────────
# Browsers treat localhost and 127.0.0.1 as different origins, which matters for
# the credentialed requests this API relies on. The loopback origins are added
# ONLY outside production; in production the allowlist is exactly FRONTEND_URL,
# because allow_credentials=True means any allowed origin can read authenticated
# responses.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
_configured_origins = [o.strip() for o in FRONTEND_URL.split(",") if o.strip()]
_local_dev_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
CORS_ORIGINS = list(dict.fromkeys(
    _configured_origins if IS_PRODUCTION else [*_configured_origins, *_local_dev_origins]
))

# ── Email (Resend) ─────────────────────────────────────────────────────────
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM = os.getenv("RESEND_FROM", "onboarding@resend.dev")


def resend_is_configured() -> bool:
    """True only when a real Resend key is present (not a placeholder)."""
    key = RESEND_API_KEY
    if not key:
        return False
    return "your_resend_api_key" not in key and "re_123456789" not in key


# ── AI (Gemini) ────────────────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Optional timeout (seconds) applied to each Gemini call so a hung request cannot
# stall a worker indefinitely.
GEMINI_TIMEOUT_SECONDS = int(os.getenv("GEMINI_TIMEOUT_SECONDS", "60"))

# Fallback chain, highest quality first. Overridable via env (comma-separated) so
# a stale/renamed model id can be fixed without a code change.
_DEFAULT_GEMINI_MODEL_CHAIN = [
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.0-flash",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
]
_chain_env = os.getenv("GEMINI_MODEL_CHAIN", "")
GEMINI_MODEL_CHAIN = (
    [m.strip() for m in _chain_env.split(",") if m.strip()]
    if _chain_env.strip()
    else list(_DEFAULT_GEMINI_MODEL_CHAIN)
)


def using_default_jwt_secret() -> bool:
    return JWT_SECRET == _DEFAULT_JWT_SECRET


def validate() -> None:
    """
    Fail fast on dangerous production misconfiguration.

    Called from the app's startup lifespan so a misconfigured deploy refuses to
    serve loudly instead of silently signing tokens with a public secret.
    """
    problems = []
    if IS_PRODUCTION:
        if using_default_jwt_secret():
            problems.append(
                "JWT_SECRET is unset or still the placeholder while APP_ENV=production. "
                "Set a strong JWT_SECRET (e.g. `openssl rand -hex 32`) in the deployment "
                "environment. Refusing to start rather than sign tokens with a public secret."
            )
        if COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
            problems.append("COOKIE_SAMESITE=none requires COOKIE_SECURE=true.")
    if COOKIE_SAMESITE not in {"lax", "strict", "none"}:
        problems.append(f"COOKIE_SAMESITE must be lax|strict|none, got '{COOKIE_SAMESITE}'.")
    if problems:
        raise RuntimeError(
            "Invalid backend configuration:\n  - " + "\n  - ".join(problems)
        )
