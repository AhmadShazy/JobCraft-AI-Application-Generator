"""End-to-end auth + session-management flow against a real (throwaway) MongoDB."""

import httpx

import backend.main as main

BASE = "http://test"


def fresh_client():
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=main.app), base_url=BASE)


async def signup(client, email="user@example.com", password="abcd1234"):
    return await client.post("/auth/signup", json={"email": email, "password": password})


async def test_signup_creates_session_and_authenticates(client):
    r = await signup(client)
    assert r.status_code == 200
    assert "access_token" in client.cookies

    r = await client.get("/auth/verify")
    assert r.status_code == 200 and r.json()["status"] == "authenticated"
    assert r.json()["email_verified"] is False

    r = await client.get("/auth/sessions")
    sessions = r.json()["sessions"]
    assert len(sessions) == 1
    assert sessions[0]["current"] is True
    assert sessions[0]["device"] == "Chrome on Windows"


async def test_generate_blocked_until_verified(client):
    await signup(client)
    r = await client.post("/generate", json={"jd": "x"})
    assert r.status_code == 403


async def test_duplicate_signup_rejected(client):
    await signup(client)
    r = await signup(client)
    assert r.status_code == 400


async def test_login_is_non_enumerating(client):
    await signup(client, email="known@example.com")
    bad_pw = await client.post("/auth/login", json={"email": "known@example.com", "password": "wrongpass9"})
    unknown = await client.post("/auth/login", json={"email": "ghost@example.com", "password": "abcd1234"})
    assert bad_pw.status_code == 401 and unknown.status_code == 401
    # Identical generic message for both -> no account enumeration.
    assert bad_pw.json()["detail"] == unknown.json()["detail"] == "Invalid email or password."


async def test_multi_device_login_does_not_kill_first(client):
    await signup(client, email="multi@example.com")
    async with fresh_client() as b:
        r = await b.post("/auth/login", json={"email": "multi@example.com", "password": "abcd1234"})
        assert r.status_code == 200
        # First device still alive.
        assert (await client.get("/auth/verify")).status_code == 200
        # Two sessions now visible.
        assert len(((await client.get("/auth/sessions")).json())["sessions"]) == 2


async def test_refresh_rotation_and_reuse_detection(client):
    await signup(client, email="rot@example.com")
    old_refresh = client.cookies.get("refresh_token")

    r = await client.post("/auth/refresh")
    assert r.status_code == 200
    new_refresh = client.cookies.get("refresh_token")
    assert new_refresh != old_refresh

    # Replaying the OLD (rotated-away) token from a clean client => reuse detected.
    async with fresh_client() as replay:
        r = await replay.post("/auth/refresh", cookies={"refresh_token": old_refresh})
        assert r.status_code == 401 and "reused" in r.json()["detail"].lower()

    # And the whole session is revoked, so even the new token now fails.
    async with fresh_client() as replay2:
        r = await replay2.post("/auth/refresh", cookies={"refresh_token": new_refresh})
        assert r.status_code == 401


async def test_revoke_other_device_kills_it_immediately(client):
    await signup(client, email="rev@example.com")
    async with fresh_client() as b:
        await b.post("/auth/login", json={"email": "rev@example.com", "password": "abcd1234"})
        assert (await b.get("/auth/verify")).status_code == 200

        sessions = ((await client.get("/auth/sessions")).json())["sessions"]
        other = next(s for s in sessions if not s["current"])
        r = await client.request("DELETE", f"/auth/sessions/{other['sid']}")
        assert r.status_code == 200

        # Device B's access token is dead at once (session-revocation check).
        assert (await b.get("/auth/verify")).status_code == 401


async def test_forgot_password_is_generic(client):
    await signup(client, email="real@example.com")
    r1 = await client.post("/auth/forgot-password", json={"email": "real@example.com"})
    r2 = await client.post("/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r1.status_code == r2.status_code == 200
    assert r1.json()["message"] == r2.json()["message"]


async def test_health_reports_connected(client):
    r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["database"] == "connected"
