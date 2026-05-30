import os
import json
import uuid
import re
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Import modules from backend package
from backend.prompts import (
    RESUME_SYSTEM_PROMPT, RESUME_USER_PROMPT_TEMPLATE,
    COVER_LETTER_SYSTEM_PROMPT, COVER_LETTER_USER_PROMPT_TEMPLATE,
    QA_SYSTEM_PROMPT, QA_USER_PROMPT_TEMPLATE
)
from backend.ai_client import GeminiClient, clean_json_response
from backend.generator import generate_resume_docx, generate_cover_letter_docx

app = FastAPI(title="JobCraft AI Backend", version="1.0.0")

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Resolve directories relative to main.py
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROFILE_PATH = os.path.join(BASE_DIR, "profile.json")
HISTORY_PATH = os.path.join(BASE_DIR, "history.json")
OUTPUTS_DIR = os.path.join(BASE_DIR, "outputs")

# Ensure outputs directory exists
os.makedirs(OUTPUTS_DIR, exist_ok=True)

# Pydantic models for request validation
class GenerateRequest(BaseModel):
    jd: str
    company_name: str

class AnswerRequest(BaseModel):
    jd: str
    question: str

def sanitize_filename(name: str) -> str:
    """Removes invalid filename characters and replaces spaces with underscores."""
    clean = re.sub(r'[^a-zA-Z0-9\s\-_]', '', name)
    clean = clean.strip().replace(' ', '_')
    return clean if clean else "Company"

@app.post("/generate")
def generate_documents(request: GenerateRequest):
    try:
        # Load profile
        if not os.path.exists(PROFILE_PATH):
            raise HTTPException(status_code=500, detail="profile.json not found on backend.")
        with open(PROFILE_PATH, "r", encoding="utf-8") as f:
            profile_data = json.load(f)
        
        profile_str = json.dumps(profile_data, indent=2)
        
        # Initialize Gemini Client
        client = GeminiClient()
        
        # 1. Generate Resume content
        resume_sys = RESUME_SYSTEM_PROMPT
        resume_user = RESUME_USER_PROMPT_TEMPLATE.format(profile_json=profile_str, jd=request.jd)
        
        print("Generating resume content via Gemini...")
        raw_resume = client.generate(resume_sys, resume_user)
        cleaned_resume_str = clean_json_response(raw_resume)
        
        try:
            resume_json = json.loads(cleaned_resume_str)
        except Exception as e:
            print(f"Failed to parse resume JSON. Raw output: {raw_resume}")
            raise HTTPException(status_code=500, detail=f"Failed to parse AI-generated resume JSON: {e}")
        
        # 2. Generate Cover Letter content
        cl_sys = COVER_LETTER_SYSTEM_PROMPT
        cl_user = COVER_LETTER_USER_PROMPT_TEMPLATE.format(
            profile_json=profile_str, 
            company_name=request.company_name, 
            jd=request.jd
        )
        
        print("Generating cover letter content via Gemini...")
        raw_cl = client.generate(cl_sys, cl_user)
        cleaned_cl_str = clean_json_response(raw_cl)
        
        try:
            cl_json = json.loads(cleaned_cl_str)
        except Exception as e:
            print(f"Failed to parse cover letter JSON. Raw output: {raw_cl}")
            raise HTTPException(status_code=500, detail=f"Failed to parse AI-generated cover letter JSON: {e}")

        # 3. Create document filenames
        date_str = datetime.now().strftime("%Y-%m-%d")
        safe_company = sanitize_filename(request.company_name)
        
        resume_filename = f"Ahmad-Sheraz_{safe_company}_{date_str}.docx"
        cl_filename = f"CoverLetter_Ahmad-Sheraz_{safe_company}_{date_str}.docx"
        
        resume_filepath = os.path.join(OUTPUTS_DIR, resume_filename)
        cl_filepath = os.path.join(OUTPUTS_DIR, cl_filename)
        
        # 4. Generate the actual files
        print("Writing resume docx...")
        generate_resume_docx(resume_json, resume_filepath)
        
        print("Writing cover letter docx...")
        email = profile_data.get("email", "")
        phone = profile_data.get("phone", "")
        linkedin = profile_data.get("linkedin", "")
        github = profile_data.get("github", "")
        links = []
        if linkedin:
            links.append(linkedin)
        if github:
            links.append(github)
            
        generate_cover_letter_docx(
            cl_json,
            name=profile_data.get("name", "Ahmad Sheraz"),
            email=email,
            phone=phone,
            links=[l for l in links if l],
            output_path=cl_filepath
        )
        
        # 5. Append to history.json
        history = []
        if os.path.exists(HISTORY_PATH):
            try:
                with open(HISTORY_PATH, "r", encoding="utf-8") as hf:
                    history = json.load(hf)
            except Exception:
                history = []
        
        history_entry = {
            "id": str(uuid.uuid4()),
            "company_name": request.company_name,
            "date": date_str,
            "resume_filename": resume_filename,
            "coverletter_filename": cl_filename,
            "jd": request.jd,
            "created_at": datetime.now().isoformat()
        }
        history.insert(0, history_entry)  # Add new item to front
        
        with open(HISTORY_PATH, "w", encoding="utf-8") as hf:
            json.dump(history, hf, indent=2)
            
        return {
            "resume_url": f"/download/{resume_filename}",
            "coverletter_url": f"/download/{cl_filename}"
        }
        
    except Exception as e:
        print(f"Error in /generate: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/answer")
def answer_question(request: AnswerRequest):
    try:
        # Load profile
        if not os.path.exists(PROFILE_PATH):
            raise HTTPException(status_code=500, detail="profile.json not found on backend.")
        with open(PROFILE_PATH, "r", encoding="utf-8") as f:
            profile_data = json.load(f)
        
        profile_str = json.dumps(profile_data, indent=2)
        
        # Initialize Gemini Client
        client = GeminiClient()
        
        # Build prompt
        qa_sys = QA_SYSTEM_PROMPT
        qa_user = QA_USER_PROMPT_TEMPLATE.format(
            profile_json=profile_str,
            jd=request.jd,
            question=request.question
        )
        
        print("Answering question via Gemini...")
        answer = client.generate(qa_sys, qa_user)
        return {"answer": answer.strip()}
        
    except Exception as e:
        print(f"Error in /answer: {e}")
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
def get_profile():
    if not os.path.exists(PROFILE_PATH):
        raise HTTPException(status_code=404, detail="profile.json not found.")
    with open(PROFILE_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data

@app.get("/history")
def get_history():
    if not os.path.exists(HISTORY_PATH):
        return []
    with open(HISTORY_PATH, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
            return data
        except Exception:
            return []
