import os
import json
import uuid
import re
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Import modules from backend package
from backend.prompts import (
    RESUME_SYSTEM_PROMPT,
    COVER_LETTER_SYSTEM_PROMPT, COVER_LETTER_USER_PROMPT_TEMPLATE,
    QA_SYSTEM_PROMPT, QA_USER_PROMPT_TEMPLATE,
    build_resume_prompt
)
from backend.ai_client import GeminiClient, clean_json_response
from backend.generator import generate_resume_docx, generate_cover_letter_docx
from backend.database import connect_to_mongo, close_mongo_connection
from backend.routers.auth_router import router as auth_router
from backend.dependencies import get_current_user



# ─────────────────────────────────────────────
# Path constants (resolved relative to this file)
# ─────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
PROFILE_PATH = os.path.join(BASE_DIR, "profile.json")
HISTORY_PATH = os.path.join(BASE_DIR, "history.json")
OUTPUTS_DIR  = os.path.join(BASE_DIR, "outputs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# Profile loader — called once at startup and
# again by POST /reload-profile
# ─────────────────────────────────────────────
def _load_profile(app: FastAPI) -> None:
    """
    Reads profile.json, stores the raw dict in app.state.profile_data
    and the pre-formatted text in app.state.profile_str.
    Raises RuntimeError if the file is missing or unparseable.
    """
    if not os.path.exists(PROFILE_PATH):
        raise RuntimeError(f"profile.json not found at {PROFILE_PATH}")

    with open(PROFILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    app.state.profile_data = data
    # Pre-format once; reused by all endpoints
    app.state.profile_str  = json.dumps(data, indent=2)
    print(
        f"[startup] Profile loaded — {data.get('name', 'unknown')} | "
        f"{len(app.state.profile_str)} chars"
    )


# ─────────────────────────────────────────────
# Lifespan — runs at server start / stop
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
    try:
        _load_profile(app)
    except RuntimeError as e:
        # Log clearly; server still starts so /reload-profile can fix it later
        print(f"[startup ERROR] {e}")
        app.state.profile_data = None
        app.state.profile_str  = None

    # Connect to MongoDB
    try:
        await connect_to_mongo()
    except Exception as e:
        print(f"[mongodb startup ERROR] Could not connect to MongoDB: {e}")

    yield  # server is running here

    # ── SHUTDOWN ──
    await close_mongo_connection()


# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────
app = FastAPI(title="JobCraft AI Backend", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)

@app.get("/auth/verify")
def verify_session(current_user: dict = Depends(get_current_user)):
    return {
        "status": "authenticated",
        "user_id": current_user["_id"],
        "email": current_user["email"]
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
    client = GeminiClient()
    sys_prompt = (
        "You are a precise data extractor. Extract the hiring company name from the provided "
        "Job Description. Return ONLY the raw company name. Do not include any explanation, "
        "quotes, introductory text, or punctuation. "
        "If the company name is not mentioned, unclear, or cannot be determined, return 'unknown'."
    )
    try:
        response = client.generate(sys_prompt, jd)
        name = re.sub(r'["\'\`\.]', '', response.strip()).strip()
        return name if name and name.lower() != "unknown" else "unknown"
    except Exception as e:
        print(f"Error extracting company name: {e}")
        return "unknown"


def sanitize_filename(name: str) -> str:
    """Removes invalid filename characters and replaces spaces with underscores."""
    clean = re.sub(r'[^a-zA-Z0-9\s\-_]', '', name).strip().replace(' ', '_')
    return clean if clean else "Company"


def _require_profile(request: Request):
    """
    Returns (profile_data, profile_str) from app.state.
    Raises HTTP 503 if the profile was not loaded at startup.
    """
    if request.app.state.profile_data is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "Candidate profile is not loaded. "
                "Check that profile.json exists and call POST /reload-profile."
            )
        )
    return request.app.state.profile_data, request.app.state.profile_str


# ─────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────

@app.post("/generate")
def generate_documents(payload: GenerateRequest, request: Request):
    profile_data, profile_str = _require_profile(request)

    try:
        client = GeminiClient()

        # 1. Resume — uses pre-built prompt from profile_data (dict)
        resume_user = build_resume_prompt(profile_data, payload.jd)
        print("Generating resume content via Gemini...")
        raw_resume = client.generate(RESUME_SYSTEM_PROMPT, resume_user)

        # 2. Company name resolution
        company_name = payload.company_name.strip() if payload.company_name else None
        if not company_name:
            company_name = detect_company_name(payload.jd)
        print(f"Resolved company name: {company_name}")

        # 3. Cover letter — uses pre-formatted profile_str (JSON string)
        cl_user = COVER_LETTER_USER_PROMPT_TEMPLATE.format(
            profile_json=profile_str,
            company_name=company_name,
            jd=payload.jd
        )
        print("Generating cover letter content via Gemini...")
        raw_cl = client.generate(COVER_LETTER_SYSTEM_PROMPT, cl_user)

        cleaned_cl_str = clean_json_response(raw_cl)
        try:
            cl_json = json.loads(cleaned_cl_str)
        except Exception as e:
            print(f"Failed to parse cover letter JSON. Raw output:\n{raw_cl}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse AI-generated cover letter JSON: {e}"
            )

        # 4. File names
        date_str     = datetime.now().strftime("%Y-%m-%d")
        safe_company = sanitize_filename(company_name)
        resume_filename = f"Ahmad-Sheraz_{safe_company}_{date_str}.docx"
        cl_filename     = f"CoverLetter_Ahmad-Sheraz_{safe_company}_{date_str}.docx"
        resume_filepath = os.path.join(OUTPUTS_DIR, resume_filename)
        cl_filepath     = os.path.join(OUTPUTS_DIR, cl_filename)

        # 5. Write files
        print("Writing resume docx...")
        generate_resume_docx(raw_resume, profile_data, resume_filepath)

        print("Writing cover letter docx...")
        links = [
            l for l in [
                profile_data.get("linkedin", ""),
                profile_data.get("github", "")
            ] if l
        ]
        generate_cover_letter_docx(
            cl_json,
            name=profile_data.get("name", "Ahmad Sheraz"),
            email=profile_data.get("email", ""),
            phone=profile_data.get("phone", ""),
            links=links,
            output_path=cl_filepath
        )

        # 6. History
        history = []
        if os.path.exists(HISTORY_PATH):
            try:
                with open(HISTORY_PATH, "r", encoding="utf-8") as hf:
                    history = json.load(hf)
            except Exception:
                history = []

        history.insert(0, {
            "id": str(uuid.uuid4()),
            "company_name": company_name,
            "date": date_str,
            "resume_filename": resume_filename,
            "coverletter_filename": cl_filename,
            "jd": payload.jd,
            "created_at": datetime.now().isoformat()
        })

        with open(HISTORY_PATH, "w", encoding="utf-8") as hf:
            json.dump(history, hf, indent=2)

        return {
            "resume_url": f"/download/{resume_filename}",
            "coverletter_url": f"/download/{cl_filename}"
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /generate: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/answer")
def answer_question(payload: AnswerRequest, request: Request):
    _, profile_str = _require_profile(request)

    try:
        client = GeminiClient()

        qa_user = QA_USER_PROMPT_TEMPLATE.format(
            profile_json=profile_str,
            jd=payload.jd,
            question=payload.question
        )

        print("Answering question via Gemini...")
        answer = client.generate(QA_SYSTEM_PROMPT, qa_user)
        return {"answer": answer.strip()}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in /answer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/reload-profile")
def reload_profile(request: Request):
    """
    Re-reads profile.json and refreshes app.state without restarting the server.
    Useful after editing the candidate profile file.
    """
    try:
        _load_profile(request.app)
        name = request.app.state.profile_data.get("name", "unknown")
        print(f"[reload-profile] Profile refreshed for: {name}")
        return {
            "status": "ok",
            "message": f"Profile reloaded successfully for {name}."
        }
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download/{filename}")
def download_file(filename: str):
    filepath = os.path.join(OUTPUTS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found.")
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@app.get("/profile")
def get_profile(request: Request):
    if request.app.state.profile_data is None:
        raise HTTPException(status_code=503, detail="Profile not loaded. Call POST /reload-profile.")
    return request.app.state.profile_data


@app.get("/history")
def get_history():
    if not os.path.exists(HISTORY_PATH):
        return []
    try:
        with open(HISTORY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []
