import re
import json

from google import genai
from google.genai import types

from backend import config

# ─────────────────────────────────────────────────────────────
# Fallback chain — tried in order, highest quality first.
# Sourced from config (env-overridable).
# ─────────────────────────────────────────────────────────────
GEMINI_MODEL_CHAIN = config.GEMINI_MODEL_CHAIN

# ─────────────────────────────────────────────────────────────
# Task-specific generation configs
# Higher temperature → more natural, varied language (writing tasks)
# Lower temperature  → deterministic, precise output (structured/JSON tasks)
# JSON tasks additionally request application/json so the model returns parseable
# output rather than prose or fenced text.
# ─────────────────────────────────────────────────────────────
TASK_CONFIGS = {
    "resume": {
        "max_output_tokens": 65536,   # Long resumes need room — never truncate
        "temperature": 0.6,           # Varied, human-sounding bullet points
    },
    "cover_letter": {
        "max_output_tokens": 8192,
        "temperature": 0.7,           # Warm, flowing prose
        "response_mime_type": "application/json",
    },
    "qa": {
        "max_output_tokens": 4096,
        "temperature": 0.5,           # Clear + confident, with some personality
    },
    "normalize": {
        "max_output_tokens": 8192,
        "temperature": 0.1,           # Highly deterministic — precise JSON extraction
        "response_mime_type": "application/json",
    },
    "detect": {
        "max_output_tokens": 256,
        "temperature": 0.1,           # Exact extraction (company name etc.)
    },
}

# ─────────────────────────────────────────────────────────────
# Error classification. Each category advances the fallback chain, but the FINAL
# error message reflects what actually went wrong, so an invalid model id no
# longer masquerades as a quota problem.
# ─────────────────────────────────────────────────────────────
_QUOTA_PATTERNS = re.compile(
    r"quota[_ ]exceeded|rate[_ ]limit|resource[_ ]exhausted|\b429\b|too many requests",
    re.IGNORECASE,
)
_UNAVAILABLE_PATTERNS = re.compile(
    r"\b503\b|overloaded|unavailable|try again|temporarily|deadline|timeout|timed out",
    re.IGNORECASE,
)
_NOT_FOUND_PATTERNS = re.compile(
    r"\b404\b|not[_ ]found|not[_ ]supported|is not supported|unknown model|no such model",
    re.IGNORECASE,
)


def _classify(exc: Exception) -> str:
    """Return one of: 'quota', 'unavailable', 'not_found', or 'hard'."""
    msg = str(exc)
    if _QUOTA_PATTERNS.search(msg):
        return "quota"
    if _NOT_FOUND_PATTERNS.search(msg):
        return "not_found"
    if _UNAVAILABLE_PATTERNS.search(msg):
        return "unavailable"
    return "hard"


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
        api_key = config.GEMINI_API_KEY
        if not api_key or "Dummy" in api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set or is still the dummy value. "
                "Please configure a valid API key in backend/.env"
            )
        # A per-call timeout so a hung request cannot stall a worker forever
        # (HttpOptions.timeout is milliseconds).
        self._client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=config.GEMINI_TIMEOUT_SECONDS * 1000),
        )

    def _build_config(self, task_cfg: dict, system_prompt: str) -> types.GenerateContentConfig:
        kwargs = dict(
            system_instruction=system_prompt,
            max_output_tokens=task_cfg["max_output_tokens"],
            temperature=task_cfg["temperature"],
        )
        if task_cfg.get("response_mime_type"):
            kwargs["response_mime_type"] = task_cfg["response_mime_type"]
        return types.GenerateContentConfig(**kwargs)

    def _extract_text(self, response) -> str:
        """Return response text, raising if the model stopped early or returned nothing."""
        candidates = getattr(response, "candidates", None) or []
        if candidates:
            fr = getattr(candidates[0], "finish_reason", None)
            fr_name = getattr(fr, "name", None) if fr is not None else None
            # STOP is the only clean completion. MAX_TOKENS means a truncated
            # document; SAFETY/RECITATION/etc. mean blocked. Never save those as
            # a successful generation.
            if fr_name and fr_name not in ("STOP", "FINISH_REASON_UNSPECIFIED"):
                raise ValueError(f"Model did not finish cleanly (finish_reason={fr_name}).")
        text = getattr(response, "text", None)
        if not text or not text.strip():
            raise ValueError("Received empty response from Gemini API.")
        return text

    def generate(self, system_prompt: str, user_prompt: str, task: str = "resume") -> str:
        """
        Attempts generation using each model in GEMINI_MODEL_CHAIN in order.

        - Quota / availability / not-found errors → advance to the next model.
        - Transient (unavailable) errors          → retry the SAME model once first.
        - Hard errors (bad key, truncation, etc.) → stop immediately and re-raise.
        - All models exhausted                    → raise a message matching the
                                                    dominant failure category.
        """
        task_cfg = TASK_CONFIGS.get(task, TASK_CONFIGS["resume"])
        gen_config = self._build_config(task_cfg, system_prompt)
        skipped: list[tuple[str, str]] = []
        categories: list[str] = []

        for model_name in GEMINI_MODEL_CHAIN:
            attempts = 0
            while True:
                attempts += 1
                try:
                    print(f"[gemini] Attempting model: {model_name} (task={task}, temp={task_cfg['temperature']})")
                    response = self._client.models.generate_content(
                        model=model_name,
                        contents=user_prompt,
                        config=gen_config,
                    )
                    text = self._extract_text(response)

                    if skipped:
                        print(f"[gemini] SUCCESS with {model_name} (skipped: {', '.join(m for m, _ in skipped)})")
                    else:
                        print(f"[gemini] SUCCESS with {model_name}")
                    return text

                except Exception as exc:
                    category = _classify(exc)
                    short = str(exc)[:160].replace("\n", " ")

                    # Retry the same model once for a transient blip before falling back.
                    if category == "unavailable" and attempts < 2:
                        print(f"[gemini] {model_name} transient ({short}); retrying same model.")
                        continue

                    if category in ("quota", "unavailable", "not_found"):
                        print(f"[gemini] {model_name} {category} — falling back. ({short})")
                        skipped.append((model_name, short))
                        categories.append(category)
                        break  # advance to next model

                    # Hard error — surface immediately.
                    print(f"[gemini] {model_name} hard error (not retrying): {exc}")
                    raise

        # ── All models exhausted ─────────────────────────────────────────────
        tried = ", ".join(m for m, _ in skipped)
        print(f"[gemini] All models exhausted. Tried: {tried}")
        if categories and all(c == "not_found" for c in categories):
            raise RuntimeError(
                "No configured Gemini model is currently available (all model ids returned "
                "not-found). Check GEMINI_MODEL_CHAIN against the models your API key can access."
            )
        if "quota" in categories:
            raise RuntimeError(
                "All Gemini models have reached their rate/quota limit. Please wait a moment and try again."
            )
        raise RuntimeError(
            "The AI service is temporarily unavailable. Please try again in a few moments."
        )


# ─────────────────────────────────────────────────────────────
# Lazy singleton — reuse one client (and its connection pool) across requests
# rather than constructing a new one per call.
# ─────────────────────────────────────────────────────────────
_gemini_singleton: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    global _gemini_singleton
    if _gemini_singleton is None:
        _gemini_singleton = GeminiClient()
    return _gemini_singleton


# ─────────────────────────────────────────────────────────────
# Claude placeholder — reserved provider slot for a future second provider.
# ─────────────────────────────────────────────────────────────
class ClaudeClient(AIClient):
    def generate(self, system_prompt: str, user_prompt: str, task: str = "resume") -> str:
        raise NotImplementedError("ClaudeClient is a reserved provider slot and is not implemented yet.")


# ─────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────
def clean_json_response(raw_text: str) -> str:
    """
    Robustly extracts raw JSON from a model response.

    Handles markdown code fences, stray surrounding text, and trailing commas.
    Returns a best-effort string; the CALLER is responsible for json.loads and
    schema validation (this function does not itself guarantee valid JSON).
    """
    text = raw_text.strip()

    if text.startswith("```json"):
        text = text[len("```json"):]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

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

    # Fix trailing commas before } or ] (e.g. {"a": 1,} → {"a": 1})
    text = re.sub(r',\s*([}\]])', r'\1', text)
    return text.strip()
