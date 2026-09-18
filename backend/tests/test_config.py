"""Regression guard for the JWT-secret load-order bug.

If auth.py ever again reads JWT_SECRET before .env/config is loaded, it would fall
back to the public placeholder and these assertions would fail.
"""

import backend.config as config
import backend.auth as auth


def test_config_loaded_real_secret_not_placeholder():
    assert not config.using_default_jwt_secret()
    assert config.JWT_SECRET == "unit-test-secret-value-not-the-placeholder-000000"


def test_auth_module_uses_config_secret():
    # auth.py must resolve to the same secret config loaded, not the placeholder.
    assert auth.JWT_SECRET == config.JWT_SECRET


def test_forged_placeholder_token_is_rejected():
    import jwt
    forged = jwt.encode(
        {"sub": "x", "type": "access", "sid": "y", "exp": 9999999999},
        "default_secret_key_change_me_in_production",
        algorithm="HS256",
    )
    with __import__("pytest").raises(Exception):
        auth.decode_token(forged)


def test_real_token_roundtrips_with_sid():
    sid = auth.new_session_id()
    token = auth.create_access_token("507f1f77bcf86cd799439011", "a@b.com", sid)
    decoded = auth.decode_token(token)
    assert decoded["sid"] == sid
    assert decoded["type"] == "access"
