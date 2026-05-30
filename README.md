# JobCraft AI
### Personal Job Application Generator

JobCraft AI is a local web application designed to automate the process of tailoring resumes and cover letters for job applications, and answering screening questions. It tailoring documents using your candidate profile and target job description (JD) using the Gemini 1.5 Flash API.

---

## Prerequisites
* **Node.js** (v24+ recommended)
* **Python** (3.10+ recommended)
* **Gemini API Key** (Get one for free at [Google AI Studio](https://aistudio.google.com/))

---

## Quick Start Setup & Run

Follow these instructions to run the application locally.

### 1. API Key Configuration
1. Open the file `backend/.env`.
2. Replace the placeholder value with your actual Gemini API Key:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

### 2. Start the Backend Server (FastAPI)
Open a terminal in the root folder of the project (`JobCraft-AI_Appliction-Generator`) and run:

1. **Activate the Python Virtual Environment:**
   * **PowerShell (Windows):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   * **Command Prompt (Windows):**
     ```cmd
     .\venv\Scripts\activate.bat
     ```
   * **Bash (macOS/Linux):**
     ```bash
     source venv/bin/activate
     ```

2. **Start the FastAPI Dev Server:**
   ```bash
   uvicorn backend.main:app --reload --port 8000
   ```
   The backend will start running on [http://localhost:8000](http://localhost:8000).

---

### 3. Start the Frontend App (React + Vite)
Open a **second** terminal window in the root folder of the project and run:

1. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   The frontend will start running on [http://localhost:5173](http://localhost:5173).

---

## How to Use the Application

1. Open your browser and navigate to [http://localhost:5173](http://localhost:5173).
2. Log in with the default credentials:
   * **Username:** `admin`
   * **Password:** `admin`
3. Paste the target **Job Description (JD)** and enter the **Company Name** in the left column.
4. Click **Generate Resume & Cover Letter**.
5. Once complete, click the active **Download** buttons to save your documents.
6. Ask screening questions in the **Q&A Panel** on the right side.
7. Click the **History** button in the top navigation bar to open the sliding panel where you can review past generations and redownload files.
