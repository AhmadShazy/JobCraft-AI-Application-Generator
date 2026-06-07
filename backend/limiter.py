from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
from backend.auth import decode_token

def get_user_id_key(request: Request) -> str:
    """
    Extract user ID (sub claim) from the access_token JWT cookie.
    Falls back to client IP address if token is missing or invalid.
    """
    token = request.cookies.get("access_token")
    if not token:
        return get_remote_address(request)
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id:
            return str(user_id)
    except Exception:
        pass
    return get_remote_address(request)

# Define the global rate limiter instance
# Default key function is get_remote_address (by IP)
limiter = Limiter(key_func=get_remote_address)
