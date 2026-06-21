import os
import re
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

# ─────────────────────────────────────────────────────────────
# Fallback chain — tried in order, highest quality first.
# Only quota/rate-limit errors advance the chain;
# hard errors (bad key, malformed prompt, etc.) stop immediately.
# ─────────────────────────────────────────────────────────────
GEMINI_MODEL_CHAIN = [
    "gemini-3.1-flash-lite",    # highest quality — try first
    "gemini-3.5-flash",         # step 2
    "gemini-3.0-flash",         # step 3
    "gemini-2.5-flash",         # step 4
    "gemini-2.5-flash-lite",    # last resort
]

# ─────────────────────────────────────────────────────────────
# Task-specific generation configs
# Higher temperature → more natural, varied language (writing tasks)
# Lower temperature  → deterministic, precise output (structured/JSON tasks)
# ─────────────────────────────────────────────────────────────
TASK_CONFIGS = {
    "resume": {
        "max_output_tokens": 65536,   # Long resumes need room — never truncate
        "temperature": 0.6,           # Varied, human-sounding bullet points
    },
    "cover_letter": {
        "max_output_tokens": 8192,
        "temperature": 0.7,           # Warm, flowing prose
    },
    "qa": {
        "max_output_tokens": 4096,
        "temperature": 0.5,           # Clear + confident, with some personality
    },
    "normalize": {
        "max_output_tokens": 8192,
        "temperature": 0.1,           # Highly deterministic — precise JSON extraction
    },
    "detect": {
        "max_output_tokens": 256,
        "temperature": 0.1,           # Exact extraction (company name etc.)
    },
}

# ─────────────────────────────────────────────────────────────
# Patterns that indicate a transient / quota / availability error → try next model.
# ─────────────────────────────────────────────────────────────
_RETRYABLE_PATTERNS = re.compile(
    r"quota[_ ]exceeded|rate[_ ]limit|resource[_ ]exhausted|"
    r"429|503|404|overloaded|try again|"
    r"not[_ ]found|not[_ ]supported|unavailable|temporarily",
    re.IGNORECASE,
)

def _is_retryable(exc: Exception) -> bool:
    """Return True if the exception is a quota/rate-limit/availability issue."""
    return bool(_RETRYABLE_PATTERNS.search(str(exc)))


# ─────────────────────────────────────────────────────────────
# Base class
# ─────────────────────────────────────────────────────────────
class AIClient:
    def generate(self, system_prompt: str, user_prompt: str, task: str = "resume") -> str:
        """
        Sends a request to the AI model with a system prompt and a user prompt.
        task: one of 'resume', 'cover_letter', 'qa', 'normalize', 'detect'
        Returns the raw string output.
        """
        raise NotImplementedError("Subclasses must implement generate()")


# ─────────────────────────────────────────────────────────────
# Gemini implementation using google-genai SDK
# ─────────────────────────────────────────────────────────────
class GeminiClient(AIClient):
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key or "Dummy" in api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set or is still the dummy value. "
                "Please configure a valid API key in backend/.env"
            )
        self._client = genai.Client(api_key=api_key)

    def generate(self, system_prompt: str, user_prompt: str, task: str = "resume") -> str:
        """
        Attempts generation using each model in GEMINI_MODEL_CHAIN in order.
        Uses task-specific temperature and token limits from TASK_CONFIGS.

        - Quota / rate-limit errors  → silently advance to next model.
        - Hard errors (bad key, etc) → stop immediately and re-raise.
        - All models exhausted       → raise a clear user-friendly error.
        """
        config = TASK_CONFIGS.get(task, TASK_CONFIGS["resume"])
        skipped: list[tuple[str, str]] = []

        for model_name in GEMINI_MODEL_CHAIN:
            try:
                print(f"[gemini] Attempting model: {model_name} (task={task}, temp={config['temperature']})")

                response = self._client.models.generate_content(
                    model=model_name,
                    contents=user_prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        max_output_tokens=config["max_output_tokens"],
                        temperature=config["temperature"],
                    ),
                )

                if not response.text:
                    raise ValueError("Received empty response from Gemini API.")

                # ── Success ──────────────────────────────────────────────
                if skipped:
                    skipped_names = ", ".join(m for m, _ in skipped)
                    print(f"[gemini] SUCCESS with {model_name} (skipped: {skipped_names})")
                else:
                    print(f"[gemini] SUCCESS with {model_name}")

                return response.text

            except Exception as exc:
                if _is_retryable(exc):
                    short = str(exc)[:120].replace("\n", " ")
                    print(f"[gemini] {model_name} quota/rate-limit — falling back. ({short})")
                    skipped.append((model_name, short))
                    continue

                # Hard error — surface it immediately
                print(f"[gemini] {model_name} hard error (not retrying): {exc}")
                raise

        # ── All models exhausted ──────────────────────────────────────
        skipped_names = ", ".join(m for m, _ in skipped)
        print(f"[gemini] All models exhausted. Tried: {skipped_names}")
        raise RuntimeError(
            "All Gemini models have reached their rate/quota limit. "
            "Please wait a moment and try again."
        )


# ─────────────────────────────────────────────────────────────
# Claude placeholder (Phase 5)
# ─────────────────────────────────────────────────────────────
class ClaudeClient(AIClient):
    def __init__(self):
        api_key = os.getenv("CLAUDE_API_KEY")
        if not api_key:
            raise ValueError("CLAUDE_API_KEY is not set in backend/.env")

    def generate(self, system_prompt: str, user_prompt: str, task: str = "resume") -> str:
        raise NotImplementedError(
            "ClaudeClient is not implemented yet. It will be implemented in Phase 5."
        )


# ─────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────
def clean_json_response(raw_text: str) -> str:
    """
    Robustly extracts the raw JSON from a Gemini response.

    Handles:
    - Markdown code fences (```json ... ``` or ``` ... ```)
    - Stray text before/after the JSON object
    - Trailing commas before closing braces/brackets (common Gemini quirk)
    """
    text = raw_text.strip()

    # 1. Strip markdown code fences
    if text.startswith("```json"):
        text = text[len("```json"):]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    # 2. Extract the JSON object/array if there's surrounding text
    first_brace = -1
    last_brace = -1
    for i, ch in enumerate(text):
        if ch in ('{', '['):
            first_brace = i
            break
    for i in range(len(text) - 1, -1, -1):
        if text[i] in ('}', ']'):
            last_brace = i
            break
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        text = text[first_brace:last_brace + 1]

    # 3. Fix trailing commas before } or ] (e.g. {"a": 1,} → {"a": 1})
    text = re.sub(r',\s*([}\]])', r'\1', text)

    # 4. Validate — if not parseable, return as-is so the caller gets the raw error
    try:
        json.loads(text)
    except json.JSONDecodeError:
        pass

    return text.strip()
