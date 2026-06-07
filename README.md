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
| Auth | JWT (PyJWT) + bcrypt via passlib |
| Document Generation | python-docx |
| Local DB | Docker (MongoDB container) |

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
│   ├── main.py                  # FastAPI app — /generate, /answer, /download, /history
│   ├── ai_client.py             # Gemini client with 5-model fallback chain
│   ├── auth.py                  # JWT creation/verification, bcrypt hashing
│   ├── database.py              # Motor async MongoDB connection
│   ├── dependencies.py          # get_current_user FastAPI dependency
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
│       │   ├── DownloadPanel.jsx
│       │   └── Loader.jsx
│       └── pages/
│           ├── Login.jsx                 # Login + Signup tabs
│           ├── ProfileSetup.jsx          # 4-step onboarding wizard
│           ├── ProfileEdit.jsx           # Profile management screen
│           ├── Home.jsx                  # Main workspace dashboard
│           ├── VerifyEmailPage.jsx       # Public email verification landing page
│           └── EmailVerificationGate.jsx # Hard wall gating unverified sessions
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | No | Register new user account (automatically dispatches verification link) |
| `POST` | `/auth/login` | No | Login — sets `httpOnly` auth cookies |
| `POST` | `/auth/logout` | No | Clears auth cookies |
| `POST` | `/auth/refresh` | Cookie | Silently rotate access + refresh tokens |
| `GET` | `/auth/verify` | Yes (lighter) | Verify active session status (returns verification status) |
| `POST` | `/auth/send-verification` | Yes (lighter) | Generate secure token and send HTML verification link via Resend |
| `GET` | `/auth/verify-email` | No | Public verification endpoint for token validation |
| `POST` | `/profile/normalize` | Yes | AI-normalize raw profile text via Gemini |
| `POST` | `/profile/save` | Yes | Save confirmed structured profile |
| `GET` | `/profile/me` | Yes | Fetch current user's profile |
| `PATCH` | `/profile/update` | Yes | Update profile (partial or full) |
| `POST` | `/generate` | Yes | Generate tailored resume + cover letter |
| `POST` | `/answer` | Yes | Answer a screening question |
| `GET` | `/download/{filename}` | Yes | Download file (user-scoped — 403 if not yours) |
| `GET` | `/history` | Yes | Fetch user's generation history |

---

## Security Model

- Passwords hashed with **bcrypt** — never stored in plain text
- **JWT access tokens** expire in 30 minutes; **refresh tokens** expire in 7 days
- Both tokens stored in **`httpOnly` cookies** — inaccessible to JavaScript
- **Refresh token rotation** — every silent refresh issues a new pair and invalidates the previous one; replayed tokens trigger immediate session termination
- File downloads are **user-scoped** — queried against the user's own history before serving; a 403 is returned if the file belongs to another user

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `DB_NAME` | ✅ | MongoDB database name |
| `JWT_SECRET` | ✅ | Secret key for signing JWT tokens |
| `JWT_ALGORITHM` | ✅ | `HS256` recommended |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | ✅ | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | ✅ | Refresh token lifetime |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `RESEND_API_KEY` | ❌ | API key for Resend email service (console fallback if empty) |
| `FRONTEND_URL` | ❌ | Base URL of React app for links in verification emails |

---

## Notes

- Generated `.docx` files live in `backend/outputs/` — gitignored, never committed
- The `.env` file is gitignored — never commit your real secrets
- MongoDB data persists in Docker volume `mongodb_data` between container restarts
- The Gemini client silently tries 5 model variants in order if quota limits are hit — no manual intervention needed
- Email verification is fully integrated using **Resend**; new accounts are automatically gated until their email is verified