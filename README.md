# JobCraft AI
> **AI-powered job application generator** — tailors resumes, cover letters, and screening question answers to any job description using your personal profile and the Google Gemini API.

---

## What It Does

Paste a job description, click generate — JobCraft AI reads your profile, analyzes the JD, and delivers a tailored `.docx` resume and cover letter in seconds. No manual formatting. No copy-pasting. Every output is ATS-aware and written to match the specific role.

It also features a built-in **Q&A assistant** that answers screening questions in your voice, using your experience and the JD as context.

---

## Key Features

- **4-Step Profile Wizard** — structured onboarding that collects your basic info, education, and professional background as free text, then uses Gemini to normalize it into a structured profile
- **Email Verification & Security Gate** — automatic email verification dispatch on account signup using Resend. Sessions are gated under a strict verification wall (`EmailVerificationGate.jsx`) with 5-second polling intervals to auto-unlock the application once verified.
- **AI Document Generation** — tailored resume and cover letter generated as `.docx` files with one click
- **Intelligent Company Detection** — automatically extracts the hiring company name from the JD if you don't provide one
- **Q&A Assistant** — answers screening questions in context of both your profile and the JD, with a one-click copy button
- **Generation History** — every application is logged per user; slide open the history drawer to re-download any past file
- **Profile Editor** — update your profile at any time; background sections go through Gemini re-normalization with a preview before saving
- **Gemini Fallback Chain** — automatically retries across 5 Gemini model variants if quota or rate limits are hit; never crashes silently
- **Secure Multi-User Auth** — JWT access + refresh tokens in `httpOnly` cookies, bcrypt password hashing, refresh token rotation with replay detection

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite |
| Styling | Vanilla CSS + Tailwind CSS utility classes |
| Backend | FastAPI (Python 3.10+) |
| Database | MongoDB via Motor (async) |
| AI | Google Gemini API (5-model fallback chain) |
| Auth | JWT (PyJWT) + bcrypt (used directly) |
| Rate limiting | slowapi (per-user / per-IP) |
| Document Generation | python-docx |
| Local DB | Docker (MongoDB container) |
| Prod servers | Frontend on Vercel, backend on Render (gunicorn + uvicorn worker) |

---

## Prerequisites

- **Node.js** v20+
- **Python** 3.10+
- **Docker Desktop** (for the MongoDB container)
- **Gemini API Key** — free at [Google AI Studio](https://aistudio.google.com/)

---

## Installation & Setup

### 1. Clone

```bash
git clone https://github.com/AhmadShazy/JobCraft-AI-Application-Generator.git
cd JobCraft-AI-Application-Generator
```

### 2. Environment Variables

Copy the example file:

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017
DB_NAME=jobcraft_db

# JWT — generate with: openssl rand -hex 32
JWT_SECRET=your_secure_secret_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Resend Email Verification (Console logging fallback if empty)
RESEND_API_KEY=your_resend_api_key_here
FRONTEND_URL=http://localhost:5173
```

### 3. Start MongoDB (Docker)

Make sure Docker Desktop is running:

```bash
docker-compose up -d
```

MongoDB starts on port `27017`. Data persists in a named Docker volume between restarts.

### 4. Backend (FastAPI)

From the project root, activate your virtual environment and start the server:

**Windows — PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000
```

**Windows — Command Prompt:**
```cmd
.\venv\Scripts\activate.bat
uvicorn backend.main:app --reload --port 8000
```

**macOS / Linux:**
```bash
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

Backend runs at → `http://localhost:8000`

### 5. Frontend (React + Vite)

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at → `http://localhost:5173`

---

## First-Time Use

1. Open `http://localhost:5173`
2. Click **Create Account**, enter your email and a password (min 8 chars, at least one number)
3. Complete the **4-step Profile Setup Wizard**:

| Step | What you fill in |
|---|---|
| 1 — Basic Info | Name, email, phone, location, LinkedIn, GitHub, portfolio, headline, languages |
| 2 — Education | Degree, institution, field, dates — supports multiple entries |
| 3 — Background | Paste free text: experience, skills, projects, certifications, volunteering |
| 4 — AI Review | Gemini normalizes your text into structured JSON — preview and confirm before saving |

---

## Generating Documents

1. Log in and paste the full **Job Description** into the left panel
2. Click **Generate Resume & Cover Letter**
3. Both `.docx` files download automatically
4. They are also saved to your **History** for re-download at any time

---

## Q&A Assistant

- Type a screening question in the right panel (the JD must be filled first)
- The AI answers in context of your profile + the JD
- Click the copy icon on any answer to copy it to clipboard

---

## Editing Your Profile

Click **Edit Profile** in the navbar:
- Basic info and education update immediately — no AI step needed
- Changes to experience, skills, projects, and other background sections trigger Gemini re-normalization and show a preview before saving

---

## Project Structure

```
JobCraft-AI-Application-Generator/
│
├── backend/
│   ├── config.py                # Central config — loads .env FIRST, validates prod settings
│   ├── main.py                  # FastAPI app — /health, /generate, /answer, /download, /history
│   ├── ai_client.py             # Gemini client with model fallback chain + timeouts
│   ├── auth.py                  # JWT + session tokens, bcrypt hashing, cookie/device helpers
│   ├── database.py              # Motor async MongoDB connection + indexes
│   ├── dependencies.py          # get_current_user / session-revocation dependency
│   ├── limiter.py               # slowapi rate limiter (proxy-aware client IP)
│   ├── generator.py             # .docx resume + cover letter builder (python-docx)
│   ├── prompts.py               # All Gemini prompts (resume, cover letter, Q&A, normalization)
│   ├── requirements.txt
│   ├── outputs/                 # Generated .docx files — gitignored
│   └── routers/
│       ├── auth_router.py       # /auth/signup, /auth/login, /auth/logout, /auth/refresh
│       └── profile_router.py   # /profile/normalize, /profile/save, /profile/me, /profile/update
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── client.js        # Axios instance + all API call functions
│       ├── context/
│       │   ├── AuthContext.jsx  # Global auth state — login, signup, logout, session check
│       │   └── ToastContext.jsx # Floating toast notification system
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── JDInput.jsx
│       │   ├── GenerateButton.jsx
│       │   ├── QAPanel.jsx
│       │   ├── HistoryDrawer.jsx
│       │   └── Loader.jsx
│       └── pages/
│           ├── Login.jsx                 # Login + Signup + Forgot-password tabs
│           ├── ResetPasswordPage.jsx     # Public reset-password landing page (?token)
│           ├── ProfileSetup.jsx          # 4-step onboarding wizard (draft-persisted)
│           ├── ProfileEdit.jsx           # Profile management screen
│           ├── Home.jsx                  # Main workspace dashboard
│           ├── Settings.jsx              # Security & devices (active session management)
│           ├── VerifyEmailPage.jsx       # Public email verification landing page
│           └── EmailVerificationGate.jsx # Hard wall gating unverified sessions
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

Auth column: **No** = public, **Cookie** = requires a valid token cookie, **Yes** =
authenticated + email-verified, **Auth-only** = authenticated but does *not* require
a verified email. Rate limits are noted where they apply.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Liveness + MongoDB readiness (200 ok / 503 degraded) |
| `POST` | `/auth/signup` | No | Register new user (5/15min per IP; dispatches verification link) |
| `POST` | `/auth/login` | No | Login — sets `httpOnly` cookies, opens a new device session (10/15min per IP) |
| `POST` | `/auth/logout` | Cookie | Ends the current session and clears cookies |
| `POST` | `/auth/refresh` | Cookie | Rotate access + refresh tokens (reuse of a rotated token revokes the session) |
| `GET` | `/auth/verify` | Auth-only | Verify active session status (returns email-verified flag) |
| `POST` | `/auth/send-verification` | Auth-only | Send an HTML verification link via Resend (3/hour per IP) |
| `GET` | `/auth/verify-email` | No | Public verification endpoint for token validation |
| `POST` | `/auth/forgot-password` | No | Request a reset link (always generic response; 3/hour per IP) |
| `POST` | `/auth/reset-password` | No | Set a new password from a reset token; revokes all sessions (5/hour per IP) |
| `GET` | `/auth/sessions` | Auth-only | List the account's active devices/sessions |
| `DELETE` | `/auth/sessions/{sid}` | Auth-only | Sign out a specific device |
| `POST` | `/auth/sessions/revoke-others` | Auth-only | Sign out every device except the current one |
| `POST` | `/profile/normalize` | Yes | AI-normalize raw profile text via Gemini (10/hour per user) |
| `POST` | `/profile/save` | Yes | Save confirmed structured profile |
| `GET` | `/profile/me` | Yes | Fetch current user's profile |
| `PATCH` | `/profile/update` | Yes | Update profile (partial merge or full replace) |
| `POST` | `/generate` | Yes | Generate tailored resume + cover letter (5/hour per user) |
| `POST` | `/answer` | Yes | Answer a screening question (20/hour per user) |
| `GET` | `/download/{filename}` | Yes | Download a generated file (user-scoped — 403 if not yours) |
| `GET` | `/history` | Yes | Fetch user's generation history |

---

## Security Model

- Passwords hashed with **bcrypt** — never stored in plain text; login is constant-time and returns a single generic error, so it does not reveal which emails have accounts
- **JWT access tokens** expire in 30 minutes; **refresh tokens** expire in 7 days; both are stored in **`httpOnly` cookies** (Secure + SameSite configurable) — inaccessible to JavaScript
- **Multi-device sessions** — each login opens a named session (device, IP, last-active) that the user can view and revoke individually from *Security & Devices*; access tokens carry a session id, so revoking a device kills its access token immediately rather than after expiry
- **Refresh token rotation with reuse detection** — every refresh issues a new pair; a replayed (already-rotated) refresh token is treated as theft and revokes that whole session
- **Password reset** revokes every session, forcing re-login everywhere
- **Rate limiting** (slowapi) on auth and all billable AI endpoints — see the API table
- **Prompt-injection defense** — user-supplied job descriptions are delimited and marked as untrusted data in every prompt, and generated output is validated before a document is saved
- File downloads are **user-scoped** and written under a per-user directory — queried against the user's own history before serving; a 403 is returned if the file belongs to another user
- **Config safety** — the app refuses to start in production if `JWT_SECRET` is unset/placeholder, and only exact `APP_ENV=production` locks down credentialed CORS origins

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | MongoDB database name |
| `JWT_SECRET` | ✅ | Secret for signing JWTs. **Must be set in production** or the app refuses to start |
| `JWT_ALGORITHM` | ❌ | `HS256` (default) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ❌ | Access token lifetime (default 30) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | ❌ | Refresh token lifetime (default 7) |
| `PASSWORD_RESET_TOKEN_EXPIRE_MINUTES` | ❌ | Reset-link lifetime (default 60) |
| `APP_ENV` | ✅ (prod) | Set to exactly `production` on deployed instances; anything else allows localhost CORS origins for dev |
| `COOKIE_SECURE` | ❌ | `true` (default). Keep true in any real deployment |
| `COOKIE_SAMESITE` | ❌ | `lax` (default). Use `none` only for a cross-site frontend (requires `COOKIE_SECURE=true`) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `GEMINI_TIMEOUT_SECONDS` | ❌ | Per-call Gemini timeout (default 60) |
| `GEMINI_MODEL_CHAIN` | ❌ | Comma-separated model fallback override |
| `RESEND_API_KEY` | ❌ | Resend email API key (links printed to server log if empty) |
| `RESEND_FROM` | ❌ | Verified sender address (default `onboarding@resend.dev`) |
| `FRONTEND_URL` | ✅ (prod) | Base URL of the React app; also the production CORS allowlist (comma-separated for several) |

---

## Notes

- Generated `.docx` files live in `backend/outputs/` — gitignored, never committed
- The `.env` file is gitignored — never commit your real secrets
- MongoDB data persists in Docker volume `mongodb_data` between container restarts
- The Gemini client silently tries 5 model variants in order if quota limits are hit — no manual intervention needed
- Email verification is fully integrated using **Resend**; new accounts are automatically gated until their email is verified