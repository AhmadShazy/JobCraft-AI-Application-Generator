import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

class AIClient:
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """
        Sends a request to the AI model with a system prompt and a user prompt.
        Returns the raw string output.
        """
        raise NotImplementedError("Subclasses must implement generate()")

class GeminiClient(AIClient):
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or "Dummy" in api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set or is still the dummy value. "
                "Please configure a valid API key in backend/.env"
            )
        genai.configure(api_key=api_key)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        try:
            # We initialize the model with the system instruction
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_prompt
            )
            response = model.generate_content(user_prompt)
            if not response.text:
                raise ValueError("Received empty response from Gemini API.")
            return response.text
        except Exception as e:
            print(f"Error calling Gemini API: {e}")
            raise e

class ClaudeClient(AIClient):
    def __init__(self):
        api_key = os.getenv("CLAUDE_API_KEY")
        if not api_key:
            raise ValueError("CLAUDE_API_KEY is not set in backend/.env")
        # Claude initialization logic will be added in Phase 5
        
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        # Placeholder for Claude implementation in Phase 5
        raise NotImplementedError("ClaudeClient is not implemented yet. It will be implemented in Phase 5.")

def clean_json_response(raw_text: str) -> str:
    """
    Cleans up any markdown wrapper blocks (e.g. ```json ... ```) 
    that the AI model may have returned, returning a raw JSON string.
    """
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[len("```json"):]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()
