import os
import json
import re
import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded

# backend.config is imported first: its module body runs load_dotenv() before any
# other backend module reads a setting, which is what keeps the real JWT secret
# from being shadowed by the placeholder default.
from backend import config
from backend.limiter import limiter, get_user_id_key

# Import modules from backend package
from backend.prompts import (
    RESUME_SYSTEM_PROMPT,
    COVER_LETTER_SYSTEM_PROMPT, COVER_LETTER_USER_PROMPT_TEMPLATE,
    QA_SYSTEM_PROMPT, QA_USER_PROMPT_TEMPLATE,
    COMPANY_DETECT_SYSTEM_PROMPT, COMPANY_DETECT_USER_PROMPT_TEMPLATE,
    build_resume_prompt
)
from backend.ai_client import get_gemini_client, clean_json_response
from backend.generator import generate_resume_docx, generate_cover_letter_docx
from backend.database import connect_to_mongo, close_mongo_connection, get_database, is_connected
from backend.routers.auth_router import router as auth_router
from backend.routers.profile_router import router as profile_router
from backend.dependencies import get_current_user, get_authenticated_user

# ─────────────────────────────────────────────
# Path constants (resolved relative to this file)
# ─────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR  = os.path.join(BASE_DIR, "outputs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)


async def cleanup_outputs_task():
    """Background task to delete docx files older than 24 hours from the outputs folder every hour."""
    while True:
        try:
            print("[cleanup task] Scanning outputs folder for old files...")
            now = time.time()
            cutoff = now - (24 * 3600)  # 24 hours ago
            
            if os.path.exists(OUTPUTS_DIR):
                # Recurse: generated docs now live under per-user subdirectories.
                for root, _dirs, files in os.walk(OUTPUTS_DIR):
                    for filename in files:
                        if not filename.endswith(".docx"):
                            continue
                        file_path = os.path.join(root, filename)
                        try:
                            if os.path.getmtime(file_path) < cutoff:
                                os.remove(file_path)
                                print(f"[cleanup task] Deleted old file: {file_path}")
                        except Exception as file_err:
                            print(f"[cleanup task] Error accessing/deleting {file_path}: {file_err}")
        except Exception as e:
            print(f"[cleanup task ERROR] Error in cleanup task loop: {e}")
        
        # Sleep for an hour
        await asyncio.sleep(3600)


# ─────────────────────────────────────────────
# Lifespan — runs at server start / stop
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    # Refuse to start on dangerous production misconfiguration (e.g. a placeholder
    # JWT secret in production) rather than fail open.
    config.validate()

    # Connect to MongoDB. On failure the client is NOT published (get_database
    # raises a clear error), and /health will report the database as down.
    try:
        await connect_to_mongo()
    except Exception as e:
        print(f"[mongodb startup ERROR] Could not connect to MongoDB: {e}")

    # Start the clean-up task in the background
    cleanup_task = asyncio.create_task(cleanup_outputs_task())

    yield  # server is running here

    # ── SHUTDOWN ──
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass
    await close_mongo_connection()


# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────
app = FastAPI(title="JobCraft AI Backend", version="1.0.0", lifespan=lifespan)

# Rate Limiting configuration
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(RateLimitExceeded)
async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        content={"detail": "Too many requests. Please wait before trying again."}
    )

# CORS origins are resolved in backend.config: exactly FRONTEND_URL in production,
# plus the loopback origins outside production. allow_credentials=True means only
# these exact origins may read authenticated responses. (In the deployed topology
# the frontend reaches the API same-origin via the Vercel /api proxy, so this
# allowlist matters mainly for any direct cross-origin access to the API host.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(profile_router)


@app.get("/health")
async def health():
    """Liveness + database readiness. Lets a deployment tell 'app up' from 'app up but DB down'."""
    db_ok = is_connected()
    return JSONResponse(
        status_code=status.HTTP_200_OK if db_ok else status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "ok" if db_ok else "degraded", "database": "connected" if db_ok else "unavailable"},
    )


@app.get("/auth/verify")
def verify_session(current_user: dict = Depends(get_authenticated_user)):
    return {
        "status": "authenticated",
        "user_id": current_user["_id"],
        "email": current_user["email"],
        "email_verified": current_user.get("email_verified", False)
    }


# ─────────────────────────────────────────────
# Request schemas
# ─────────────────────────────────────────────
class GenerateRequest(BaseModel):
    jd: str
    company_name: str | None = None

class AnswerRequest(BaseModel):
    jd: str
    question: str


# ─────────────────────────────────────────────
# Utility helpers
# ─────────────────────────────────────────────
def detect_company_name(jd: str) -> str:
    """Extracts the hiring company name from the JD via Gemini. Falls back to 'unknown'."""
    client = get_gemini_client()
    user_prompt = COMPANY_DETECT_USER_PROMPT_TEMPLATE.format(jd=jd)
    try:
        response = client.generate(COMPANY_DETECT_SYSTEM_PROMPT, user_prompt, task="detect")
        name = re.sub(r'["\'\`\.]', '', response.strip()).strip()
        return name if name and name.lower() != "unknown" else "unknown"
    except Exception as e:
        print(f"Error extracting company name: {e}")
        return "unknown"


def sanitize_for_filename(name: str) -> str:
    """Strips special characters and replaces spaces with hyphens."""
    # Strip special characters: keep letters, numbers, spaces, hyphens
    clean = re.sub(r'[^a-zA-Z0-9\s\-]', '', name)
    # Replace whitespace and hyphens with single hyphen
    clean = re.sub(r'[\s\-]+', '-', clean).strip('-')
    return clean


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.post("/generate")
@limiter.limit("5/hour", key_func=get_user_id_key)
async def generate_documents(request: Request, payload: GenerateRequest, current_user: dict = Depends(get_current_user)):
    profile_data = current_user.get("profile", {})
    if not profile_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate profile data is empty. Please configure your profile first."
        )

    profile_str = json.dumps(profile_data, indent=2)

    try:
        client = get_gemini_client()

        # A single generation timestamp drives the cover-letter date, the history
        # date, and the filename stamp so they can never disagree across midnight.
        generation_dt = datetime.now(timezone.utc)
        current_date_str = f"{generation_dt.strftime('%B')} {generation_dt.day}, {generation_dt.year}"
        date_str = generation_dt.strftime("%Y-%m-%d")
        file_stamp = generation_dt.strftime("%Y-%m-%d_%H%M%S")

        # 1. Resume — uses pre-built prompt from profile_data (dict).
        # Gemini calls and docx writes are blocking; run them off the event loop
        # so one /generate does not stall every other request on the worker.
        resume_user = build_resume_prompt(profile_data, payload.jd)
        print("Generating resume content via Gemini...")
        raw_resume = await asyncio.to_thread(client.generate, RESUME_SYSTEM_PROMPT, resume_user, "resume")

        # 2. Company name resolution
        company_name = payload.company_name.strip() if payload.company_name else None
        if not company_name:
            company_name = await asyncio.to_thread(detect_company_name, payload.jd)
        print(f"Resolved company name: {company_name}")

        # 3. Cover letter — uses pre-formatted profile_str (JSON string)
        cl_user = COVER_LETTER_USER_PROMPT_TEMPLATE.format(
            profile_json=profile_str,
            company_name=company_name,
            current_date=current_date_str,
            jd=payload.jd
        )
        print("Generating cover letter content via Gemini...")
        raw_cl = await asyncio.to_thread(client.generate, COVER_LETTER_SYSTEM_PROMPT, cl_user, "cover_letter")

        cleaned_cl_str = clean_json_response(raw_cl)
        try:
            cl_json = json.loads(cleaned_cl_str)
        except Exception:
            print(f"Failed to parse cover letter JSON. Raw output:\n{raw_cl}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI returned an unreadable cover letter. Please try generating again.",
            )
        if not isinstance(cl_json, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="The AI returned an unexpected cover letter format. Please try generating again.",
            )
        # Always guarantee the cover letter document displays the generation date.
        cl_json["date"] = current_date_str
        candidate_name = profile_data.get("name") or "Candidate"
        if isinstance(cl_json.get("sign_off"), str):
            cl_json["sign_off"] = cl_json["sign_off"].replace("{candidate_name}", candidate_name)

        # 4. File names — written into a per-user subdirectory so two accounts can
        # never collide on an identical name/company/date and overwrite or serve
        # each other's documents.
        user_id = str(current_user["_id"])
        name_val = profile_data.get("name")
        safe_name = sanitize_for_filename(name_val) if name_val else ""
        if not safe_name:
            safe_name = user_id

        safe_company = sanitize_for_filename(company_name) or "unknown"

        resume_filename = f"{safe_name}_{safe_company}_{file_stamp}.docx"
        cl_filename     = f"CoverLetter_{safe_name}_{safe_company}_{file_stamp}.docx"
        user_dir        = os.path.join(OUTPUTS_DIR, user_id)
        resume_filepath = os.path.join(user_dir, resume_filename)
        cl_filepath     = os.path.join(user_dir, cl_filename)

        # 5. Write files (off the event loop)
        print("Writing resume docx...")
        await asyncio.to_thread(generate_resume_docx, raw_resume, profile_data, resume_filepath)

        print("Writing cover letter docx...")
        links = [
            l for l in [
                profile_data.get("linkedin", ""),
                profile_data.get("github", ""),
                profile_data.get("portfolio", "")
            ] if l
        ]
        await asyncio.to_thread(
            generate_cover_letter_docx,
            cl_json,
            candidate_name,
            profile_data.get("email", ""),
            profile_data.get("phone", ""),
            links,
            cl_filepath,
        )

        # 6. History
        db = get_database()
        await db.history.insert_one({
            "user_id": ObjectId(current_user["_id"]),
            "company_name": company_name,
            "date": date_str,
            "resume_filename": resume_filename,
            "coverletter_filename": cl_filename,
            "jd": payload.jd,
            "created_at": datetime.now(timezone.utc)
        })

        return {
            "resume_url": f"/download/{resume_filename}",
            "coverletter_url": f"/download/{cl_filename}"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Document generation failed. Please try again later.")


@app.post("/answer")
@limiter.limit("20/hour", key_func=get_user_id_key)
async def answer_question(request: Request, payload: AnswerRequest, current_user: dict = Depends(get_current_user)):
    profile_data = current_user.get("profile", {})
    if not profile_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate profile data is empty. Please configure your profile first."
        )

    profile_str = json.dumps(profile_data, indent=2)

    try:
        client = get_gemini_client()

        qa_user = QA_USER_PROMPT_TEMPLATE.format(
            profile_json=profile_str,
            jd=payload.jd,
            question=payload.question
        )

        print("Answering question via Gemini...")
        answer = await asyncio.to_thread(client.generate, QA_SYSTEM_PROMPT, qa_user, "qa")
        return {"answer": answer.strip()}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate answer. Please try again later.")


@app.get("/download/{filename}")
async def download_file(filename: str, current_user: dict = Depends(get_current_user)):
    db = get_database()

    # Reject anything that could escape the user's output directory.
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")

    # Query history to see if this user has generated this file
    log = await db.history.find_one({
        "user_id": ObjectId(current_user["_id"]),
        "$or": [
            {"resume_filename": filename},
            {"coverletter_filename": filename}
        ]
    })

    if not log:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to download this file."
        )

    # Files live under a per-user subdirectory (see /generate).
    filepath = os.path.join(OUTPUTS_DIR, str(current_user["_id"]), filename)
    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This file has expired. Generated documents are available for 24 hours — please generate again.",
        )

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@app.get("/history")
async def get_history(current_user: dict = Depends(get_current_user)):
    db = get_database()
    try:
        cursor = db.history.find({"user_id": ObjectId(current_user["_id"])}).sort("created_at", -1)
        history_records = await cursor.to_list(length=100)
        
        formatted_history = []
        for record in history_records:
            formatted_history.append({
                "id": str(record["_id"]),
                "company_name": record.get("company_name", ""),
                "date": record.get("date", ""),
                "resume_filename": record.get("resume_filename", ""),
                "coverletter_filename": record.get("coverletter_filename", ""),
                "jd": record.get("jd", ""),
                "created_at": record.get("created_at").isoformat() if isinstance(record.get("created_at"), datetime) else record.get("created_at", "")
            })
        return formatted_history
    except Exception as e:
        print(f"Error fetching history: {e}")
        return []
