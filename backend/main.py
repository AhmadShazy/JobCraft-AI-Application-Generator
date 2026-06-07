import os
import json
import re
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import FastAPI, HTTPException, Depends, status
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
from backend.database import connect_to_mongo, close_mongo_connection, get_database
from backend.routers.auth_router import router as auth_router
from backend.routers.profile_router import router as profile_router
from backend.dependencies import get_current_user

# ─────────────────────────────────────────────
# Path constants (resolved relative to this file)
# ─────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
OUTPUTS_DIR  = os.path.join(BASE_DIR, "outputs")

os.makedirs(OUTPUTS_DIR, exist_ok=True)


# ─────────────────────────────────────────────
# Lifespan — runs at server start / stop
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── STARTUP ──
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
app.include_router(profile_router)

@app.get("/auth/verify")
def verify_session(current_user: dict = Depends(get_current_user)):
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
async def generate_documents(payload: GenerateRequest, current_user: dict = Depends(get_current_user)):
    profile_data = current_user.get("profile", {})
    if not profile_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate profile data is empty. Please configure your profile first."
        )

    profile_str = json.dumps(profile_data, indent=2)

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
        now = datetime.now()
        current_date_str = f"{now.strftime('%B')} {now.day}, {now.year}"
        cl_user = COVER_LETTER_USER_PROMPT_TEMPLATE.format(
            profile_json=profile_str,
            company_name=company_name,
            current_date=current_date_str,
            jd=payload.jd
        )
        print("Generating cover letter content via Gemini...")
        raw_cl = client.generate(COVER_LETTER_SYSTEM_PROMPT, cl_user)

        cleaned_cl_str = clean_json_response(raw_cl)
        try:
            cl_json = json.loads(cleaned_cl_str)
            # Always guarantee the cover letter document displays the current generation date
            cl_json["date"] = current_date_str
        except Exception as e:
            print(f"Failed to parse cover letter JSON. Raw output:\n{raw_cl}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to parse AI-generated cover letter JSON: {e}"
            )

        # 4. File names
        date_str = datetime.now().strftime("%Y-%m-%d")
        
        name_val = profile_data.get("name")
        safe_name = ""
        if name_val:
            safe_name = sanitize_for_filename(name_val)
        if not safe_name:
            safe_name = str(current_user["_id"])
            
        safe_company = sanitize_for_filename(company_name)
        if not safe_company:
            safe_company = "unknown"
            
        resume_filename = f"{safe_name}_{safe_company}_{date_str}.docx"
        cl_filename     = f"CoverLetter_{safe_name}_{safe_company}_{date_str}.docx"
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
        print(f"Error in /generate: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/answer")
async def answer_question(payload: AnswerRequest, current_user: dict = Depends(get_current_user)):
    profile_data = current_user.get("profile", {})
    if not profile_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate profile data is empty. Please configure your profile first."
        )

    profile_str = json.dumps(profile_data, indent=2)

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
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.get("/download/{filename}")
async def download_file(filename: str, current_user: dict = Depends(get_current_user)):
    db = get_database()
    
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

    filepath = os.path.join(OUTPUTS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
        
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
