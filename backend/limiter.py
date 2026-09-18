from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request

from backend.auth import decode_token


def get_client_ip(request: Request) -> str:
    """
    Best-effort real client IP.

    The API runs behind a reverse proxy (Vercel edge -> Render -> the app), so
    request.client.host is the proxy, not the user. Without this, every user
    collapses into a single rate-limit bucket and the per-IP auth limits become
    a global cap. Prefer the left-most X-Forwarded-For hop, then Render/Cloudflare
    forwarding headers, then the socket peer.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        first = xff.split(",")[0].strip()
        if first:
            return first
    real_ip = request.headers.get("x-real-ip") or request.headers.get("cf-connecting-ip")
    if real_ip:
        return real_ip.strip()
    return get_remote_address(request)


def get_user_id_key(request: Request) -> str:
    """
    Rate-limit key = the authenticated user's id (JWT sub), falling back to the
    client IP when there is no valid access token.
    """
    token = request.cookies.get("access_token")
    if not token:
        return get_client_ip(request)
    try:
        payload = decode_token(token)
        # Only an actual access token identifies a user here; a refresh token in
        # the access_token cookie must not be honoured as a rate-limit identity.
        if payload.get("type") == "access":
            user_id = payload.get("sub")
            if user_id:
                return str(user_id)
    except Exception:
        pass
    return get_client_ip(request)


# Global limiter. Default identity is the proxy-aware client IP.
# NOTE: storage is in-process memory, which is correct for the current
# single-worker deployment. If the backend is ever scaled to multiple workers,
# configure a shared storage_uri (e.g. Redis) so limits are enforced globally.
limiter = Limiter(key_func=get_client_ip)
