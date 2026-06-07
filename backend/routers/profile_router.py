import json
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from backend.ai_client import GeminiClient, clean_json_response
from backend.prompts import (
    PROFILE_NORMALIZATION_SYSTEM_PROMPT,
    PROFILE_NORMALIZATION_USER_PROMPT_TEMPLATE
)
from backend.dependencies import get_current_user
from backend.database import get_database

router = APIRouter(prefix="/profile", tags=["Profile"])

class NormalizeRequest(BaseModel):
    basic_info: dict
    education: list[dict]
    experience: str | None = ""
    skills: str | None = ""
    projects: str | None = ""
    certifications: str | None = ""
    volunteer: str | None = ""
    additional_info: str | None = ""

class SaveProfileRequest(BaseModel):
    profile: dict

class UpdateProfileRequest(BaseModel):
    profile: dict | None = None
    basic_info: dict | None = None
    education: list[dict] | None = None

@router.patch("/update")
async def update_profile(payload: UpdateProfileRequest, current_user: dict = Depends(get_current_user)):
    """
    Updates the authenticated user's profile.
    - If 'profile' is sent (a full normalized profile), it overwrites the existing profile.
    - If 'basic_info' or 'education' is sent, it merges these fields directly without Gemini.
    """
    db = get_database()
    existing_profile = current_user.get("profile", {})
    
    if payload.profile is not None:
        updated_profile = payload.profile
    else:
        updated_profile = {**existing_profile}
        if payload.basic_info is not None:
            for k, v in payload.basic_info.items():
                updated_profile[k] = v
        if payload.education is not None:
            updated_profile["education"] = payload.education
            
    # Re-evaluate profile completeness
    name = updated_profile.get("name")
    email = updated_profile.get("email")
    phone = updated_profile.get("phone")
    location = updated_profile.get("location")
    education = updated_profile.get("education", [])
    is_complete = bool(name and email and phone and location and education)
    
    from bson import ObjectId
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "profile": updated_profile,
                "profile_complete": is_complete
            }
        }
    )
    
    return {
        "status": "ok",
        "message": "Profile updated successfully.",
        "profile_complete": is_complete
    }

@router.post("/normalize")
async def normalize_profile(payload: NormalizeRequest, current_user: dict = Depends(get_current_user)):
    """
    Receives the entire profile data from the frontend wizard,
    calls Gemini to parse and normalize the free-text and form data,
    and returns a clean, structured JSON object.
    """
    try:
        # Construct the user prompt, placing additional_info at the very end
        input_data = {
            "basic_info": payload.basic_info,
            "education": payload.education,
            "experience": payload.experience,
            "skills": payload.skills,
            "projects": payload.projects,
            "certifications": payload.certifications,
            "volunteer": payload.volunteer,
            "additional_info": payload.additional_info
        }
        
        user_prompt = PROFILE_NORMALIZATION_USER_PROMPT_TEMPLATE.format(
            raw_profile_data=json.dumps(input_data, indent=2)
        )
        
        client = GeminiClient()
        raw_response = client.generate(PROFILE_NORMALIZATION_SYSTEM_PROMPT, user_prompt)
        cleaned_json_str = clean_json_response(raw_response)
        
        # Parse output to verify it is valid JSON
        normalized_data = json.loads(cleaned_json_str)
        return normalized_data
        
    except json.JSONDecodeError as je:
        print(f"[profile-normalize] Failed to parse Gemini response as JSON: {je}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI normalization returned malformed data. Please try rephrasing your input."
        )
    except Exception as e:
        print(f"[ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Profile processing failed. Please try again later."
        )

@router.post("/save")
async def save_profile(payload: SaveProfileRequest, current_user: dict = Depends(get_current_user)):
    """
    Saves the normalized and user-confirmed profile data into the user's document in MongoDB.
    Sets 'profile_complete' to True if required fields are present.
    """
    db = get_database()
    profile_data = payload.profile
    
    # Check if basic required fields are present to mark profile as complete
    # Required: Name, Email, Phone, Location, and at least one education entry
    name = profile_data.get("name")
    email = profile_data.get("email")
    phone = profile_data.get("phone")
    location = profile_data.get("location")
    education = profile_data.get("education", [])
    
    is_complete = bool(name and email and phone and location and education)
    
    from bson import ObjectId
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {
            "$set": {
                "profile": profile_data,
                "profile_complete": is_complete
            }
        }
    )
    
    return {
        "status": "ok",
        "message": "Profile saved successfully.",
        "profile_complete": is_complete
    }

@router.get("/me")
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """
    Returns the current user's profile data stored in MongoDB.
    """
    return {
        "profile": current_user.get("profile", {}),
        "profile_complete": current_user.get("profile_complete", False)
    }
