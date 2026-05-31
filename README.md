# JobCraft AI
### Personal Job Application Generator — v2.0

JobCraft AI is a secure, multi-user web application that automates tailoring resumes, cover letters, and screening question answers for job applications. Each user has their own protected profile and generation history. Documents are ATS-optimized using the **Gemini API** and generated as `.docx` files ready to submit.

---

## What's New in v2.0

- Full multi-user support with secure JWT authentication
- 4-step guided profile setup wizard with AI normalization
- MongoDB database — all profiles and history stored per user
- Profile edit screen with change detection
- Dynamic file naming using authenticated user's real name
- Refresh token rotation for session security
- Entire app gated behind authentication

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | MongoDB (via Motor async driver) |
| AI | Google Gemini API (fallback chain) |
| Auth | JWT + httpOnly cookies, bcrypt |
| Local DB | Docker (MongoDB container) |

---

## Prerequisites

- **Node.js** v20+
- **Python** 3.10+
- **Docker Desktop** (for MongoDB)
- **Gemini API Key** — [Get one free at Google AI Studio](https://aistudio.google.com/)

---

## Setup & Installation

### 1. Clone the Repository

```bash
git clone https://github.com/AhmadShazy/JobCraft-AI-Application-Generator.git
cd JobCraft-AI-Application-Generator
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and configure:

```env
# MongoDB
MONGO_URI=mongodb://localhost:27017
DB_NAME=jobcraft_db

# JWT Auth — generate a strong secret key
# Run: openssl rand -hex 32
JWT_SECRET=your_secure_jwt_secret_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Start MongoDB via Docker

Make sure Docker Desktop is running, then:

```bash
docker-compose up -d
```

MongoDB will start on port `27017` in the background. Data persists in a Docker volume between restarts.

### 4. Start the Backend (FastAPI)

From the project root, activate your Python virtual environment and start the server:

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
uvicorn backend.main:app --reload --port 8000
```

**Windows (Command Prompt):**
```cmd
.\venv\Scripts\activate.bat
uvicorn backend.main:app --reload --port 8000
```

**macOS / Linux:**
```bash
source venv/bin/activate
uvicorn backend.main:app --reload --port 8000
```

Backend runs at: [http://localhost:8000](http://localhost:8000)

### 5. Start the Frontend (React + Vite)

Open a **second terminal** and run:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: [http://localhost:5173](http://localhost:5173)

---

## How to Use

### First Time — Create an Account

1. Open [http://localhost:5173](http://localhost:5173)
2. Click **Create Account**
3. Enter your email and a password (min 8 characters, at least one number)
4. Complete the **4-step Profile Setup Wizard**:
   - **Step 1** — Basic Info: name, email, phone, location, LinkedIn, GitHub, headline, languages
   - **Step 2** — Education: degree, institution, field of study, dates (multiple entries supported)
   - **Step 3** — Professional Background: paste free text for experience, skills, projects, certifications, volunteering
   - **Step 4** — AI Review: Gemini normalizes your input into structured JSON — review and confirm before saving

### Generating Documents

1. Log in to your workspace
2. Paste the full **Job Description** into the left panel
3. Click **Generate Resume & Cover Letter**
4. Your tailored `.docx` files will auto-download
5. Files are also saved to **History** for re-download anytime

### Q&A Assistant

- Type any screening question in the right panel
- Character and word limits are auto-detected from the question text
- Answers are copy-paste ready

### History

- Click **History** in the navbar to view all past generations
- Re-download any previous resume or cover letter
- View the original JD used for each generation

### Edit Profile

- Click **Edit Profile** in the navbar
- Update basic info and education directly (no AI needed)
- Update background details (experience, skills, projects etc.) — changes go through Gemini normalization and a preview confirmation before saving

---

## Project Structure

```
JobCraft-AI-Application-Generator/
├── backend/
│   ├── main.py               # FastAPI app, generation + download + history endpoints
│   ├── auth.py               # JWT token logic, bcrypt hashing
│   ├── database.py           # Motor MongoDB connection
│   ├── dependencies.py       # get_current_user FastAPI dependency
│   ├── generator.py          # .docx resume + cover letter builder
│   ├── prompts.py            # Gemini prompts (resume, cover letter, Q&A, normalization)
│   ├── ai_client.py          # Gemini client with model fallback chain
│   ├── requirements.txt
│   ├── outputs/              # Generated .docx files (gitignored)
│   └── routers/
│       ├── auth_router.py    # /auth/signup, /auth/login, /auth/logout, /auth/refresh
│       └── profile_router.py # /profile/normalize, /profile/save, /profile/me, /profile/update
├── frontend/
│   └── src/
│       ├── api/client.js     # Axios instance + all API call functions
│       ├── context/
│       │   ├── AuthContext.jsx   # Global auth state, login/signup/logout
│       │   └── ToastContext.jsx  # Toast notification system
│       ├── components/       # Navbar, JDInput, QAPanel, HistoryDrawer, etc.
│       └── pages/
│           ├── Login.jsx         # Login + Signup tabs
│           ├── ProfileSetup.jsx  # 4-step wizard
│           ├── ProfileEdit.jsx   # Profile management screen
│           └── Home.jsx          # Main dashboard
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Authentication & Security

- Passwords hashed with **bcrypt** via passlib — never stored in plain text
- **JWT access tokens** (30 min) and **refresh tokens** (7 days) stored in **httpOnly cookies** — never accessible to JavaScript
- **Refresh token rotation** — each refresh issues a new pair and invalidates the old one. Replayed tokens trigger immediate session termination
- All generation, history, and download endpoints require a valid authenticated session
- File downloads are scoped — users can only download files they generated

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | No | Register new user |
| POST | `/auth/login` | No | Login and receive tokens |
| POST | `/auth/logout` | No | Clear auth cookies |
| POST | `/auth/refresh` | Cookie | Rotate tokens silently |
| GET | `/auth/verify` | Yes | Verify current session |
| POST | `/profile/normalize` | Yes | AI-normalize raw profile text |
| POST | `/profile/save` | Yes | Save confirmed profile to MongoDB |
| GET | `/profile/me` | Yes | Fetch current user profile |
| PATCH | `/profile/update` | Yes | Update profile (partial or full) |
| POST | `/generate` | Yes | Generate resume + cover letter |
| POST | `/answer` | Yes | Answer a screening question |
| GET | `/download/{filename}` | Yes | Download generated file (scoped to user) |
| GET | `/history` | Yes | Fetch user's generation history |

---

## Git Branch Structure

```
main                          ← stable, production-ready
dev                           ← integration branch
feature/mongodb               ← database foundation
feature/auth                  ← JWT authentication backend
feature/profile-setup         ← wizard + normalization endpoints + frontend
feature/profile-setup-frontend← profile wizard UI
feature/profile-edit          ← profile edit screen
feature/generation-db         ← wired generation to MongoDB, removed JSON files
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | MongoDB database name |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `JWT_ALGORITHM` | Yes | JWT algorithm (HS256 recommended) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Yes | Access token lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Yes | Refresh token lifetime in days |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |

---

## Notes

- Generated `.docx` files are stored in `backend/outputs/` — this folder is gitignored
- The `.env` file is gitignored — never commit real secrets
- MongoDB data persists in a Docker named volume (`mongodb_data`) between restarts
- Email verification is not yet implemented — `email_verified` field is stored and ready for a future phase
- The Gemini client uses an automatic model fallback chain — if one model hits quota limits it silently tries the next