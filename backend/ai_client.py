import os
import re
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# ─────────────────────────────────────────────────────────────
# Fallback chain — tried in order, highest quality first.
# Only quota/rate-limit errors advance the chain;
# hard errors (bad key, malformed prompt, etc.) stop immediately.
# ─────────────────────────────────────────────────────────────
GEMINI_MODEL_CHAIN = [
    "gemini-3.5-flash",        # highest quality — try first
    "gemini-3.1-flash-lite",   # step 2
    "gemini-2.5-flash",        # step 3
    "gemini-2.5-flash-lite",   # step 4
    "gemini-2.0-flash",        # step 5 — reliable fallback
    "gemini-2.0-flash-lite",   # last resort
]

# Patterns that indicate a transient / quota / availability error → try next model.
# Includes 404 so that model names not yet available in the current region
# are silently skipped rather than crashing the whole chain.
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
    def generate(self, system_prompt: str, user_prompt: str) -> str:
        """
        Sends a request to the AI model with a system prompt and a user prompt.
        Returns the raw string output.
        """
        raise NotImplementedError("Subclasses must implement generate()")


# ─────────────────────────────────────────────────────────────
# Gemini implementation with automatic model fallback
# ─────────────────────────────────────────────────────────────
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
        """
        Attempts generation using each model in GEMINI_MODEL_CHAIN in order.

        - Quota / rate-limit errors  → silently advance to next model.
        - Hard errors (bad key, etc) → stop immediately and re-raise.
        - All models exhausted       → raise a clear user-friendly error.
        """
        skipped: list[tuple[str, str]] = []   # (model_name, short_reason)

        for model_name in GEMINI_MODEL_CHAIN:
            try:
                print(f"[gemini] Attempting model: {model_name}")
                model = genai.GenerativeModel(
                    model_name=model_name,
                    system_instruction=system_prompt,
                )
                response = model.generate_content(
                    user_prompt,
                    generation_config={
                        "max_output_tokens": 8192,
                        "temperature": 0.3,
                    },
                )
                if not response.text:
                    raise ValueError("Received empty response from Gemini API.")

                # ── Success ──────────────────────────────────────────────
                if skipped:
                    skipped_names = ", ".join(m for m, _ in skipped)
                    print(
                        f"[gemini] SUCCESS with {model_name} "
                        f"(skipped: {skipped_names})"
                    )
                else:
                    print(f"[gemini] SUCCESS with {model_name}")

                return response.text

            except Exception as exc:
                if _is_retryable(exc):
                    short = str(exc)[:120].replace("\n", " ")
                    print(
                        f"[gemini] {model_name} quota/rate-limit — "
                        f"falling back. ({short})"
                    )
                    skipped.append((model_name, short))
                    continue   # try next model

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

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        raise NotImplementedError(
            "ClaudeClient is not implemented yet. It will be implemented in Phase 5."
        )


# ─────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────
def clean_json_response(raw_text: str) -> str:
    """
    Strips markdown code-fence wrappers (e.g. ```json ... ```) that the model
    may have returned, leaving only the raw JSON string.
    """
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[len("```json"):]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()
