def serialize_profile(profile: dict) -> str:
    lines = []
    lines.append(f"Name: {profile.get('name', 'Ahmad Sheraz')}")
    lines.append(f"Email: {profile.get('email', '')}")
    lines.append(f"Phone: {profile.get('phone', '')}")
    lines.append(f"Location: {profile.get('location', '')}")
    lines.append(f"LinkedIn: {profile.get('linkedin', '')}")
    lines.append(f"GitHub: {profile.get('github', '')}")
    lines.append(f"Tagline: {profile.get('tagline', '')}")
    lines.append(f"Summary: {profile.get('summary', '')}")
    lines.append("")
    
    lines.append("--- EDUCATION ---")
    for edu in profile.get("education", []):
        note_str = f" ({edu['note']})" if edu.get("note") else ""
        lines.append(f"Degree: {edu.get('degree', '')}")
        lines.append(f"Institution: {edu.get('institution', '')}")
        lines.append(f"Duration: {edu.get('duration', '')}{note_str}")
        lines.append("")
        
    lines.append("--- EXPERIENCE ---")
    for exp in profile.get("experience", []):
        lines.append(f"Job Title: {exp.get('title', '')}")
        lines.append(f"Company: {exp.get('company', '')}")
        lines.append(f"Location: {exp.get('location', '')}")
        lines.append(f"Duration: {exp.get('duration', '')}")
        lines.append("Bullets:")
        for b in exp.get("bullets", []):
            lines.append(f"  - {b}")
        lines.append("")

    lines.append("--- PROJECTS ---")
    for proj in profile.get("projects", []):
        type_str = f" ({proj['type']})" if proj.get("type") else ""
        lines.append(f"Project Name: {proj.get('name', '')}{type_str}")
        lines.append(f"Duration: {proj.get('duration', '')}")
        lines.append(f"Technologies: {proj.get('stack', '')}")
        lines.append("Bullets:")
        for b in proj.get("bullets", []):
            lines.append(f"  - {b}")
        lines.append("")

    lines.append("--- SKILLS ---")
    skills = profile.get("skills", {})
    for category, items in skills.items():
        lines.append(f"{category.replace('_', ' ').title()}: {', '.join(items)}")
    lines.append("")

    lines.append("--- CERTIFICATIONS ---")
    for cert in profile.get("certifications", []):
        if isinstance(cert, dict):
            lines.append(f"- {cert.get('name', '')} | {cert.get('issuer', '')} | {cert.get('date', '')}")
        else:
            lines.append(f"- {cert}")
    lines.append("")

    lines.append("--- VOLUNTEER WORK ---")
    for vol in profile.get("volunteer", []):
        if isinstance(vol, dict):
            lines.append(f"Role: {vol.get('role', '')}")
            lines.append(f"Organization: {vol.get('organization', '')}")
            lines.append(f"Duration: {vol.get('duration', '')}")
            lines.append("Bullets:")
            for b in vol.get("bullets", []):
                lines.append(f"  - {b}")
        else:
            lines.append(f"- {vol}")
        lines.append("")

    lines.append("--- EXTRACURRICULARS ---")
    for extra in profile.get("extracurriculars", []):
        if isinstance(extra, dict):
            lines.append(f"Organization: {extra.get('organization', '')}")
            lines.append(f"Role: {extra.get('role', '')}")
            lines.append(f"Year: {extra.get('year', '')}")
            lines.append("Bullets:")
            for b in extra.get("bullets", []):
                lines.append(f"  - {b}")
        else:
            lines.append(f"- {extra}")
        lines.append("")

    lines.append("--- LANGUAGES ---")
    for lang in profile.get("languages", []):
        if isinstance(lang, dict):
            lines.append(f"- {lang.get('language', '')} | {lang.get('level', '')}")
        else:
            lines.append(f"- {lang}")
            
    return "\n".join(lines)

def build_resume_prompt(profile_data: dict, jd: str) -> str:
    serialized_profile = serialize_profile(profile_data)
    return RESUME_USER_PROMPT_TEMPLATE.format(
        profile_text=serialized_profile,
        jd=jd
    )

RESUME_SYSTEM_PROMPT = """
You are an expert ATS resume writer. Your job is to generate a highly tailored, ATS-optimized resume for the candidate based on their profile and the target Job Description (JD).

Output Requirements:
1. Return ONLY the plain text resume formatted exactly with the section markers shown below. Do not include markdown code block formatting (like ```json ... ``` or ```plaintext ... ```), just the raw text content.
2. Mirror the target JD's key terms and skills directly in the resume summary and bullet points, but keep them grounded in the candidate's real experience and projects.
3. Every bullet point must reference real achievements from the candidate's actual projects or internship. Do not invent completely new projects.
4. Separate sections using the exact markers:
   === SUMMARY ===
   === SKILLS ===
   === EXPERIENCE ===
   === PROJECTS ===
   === EDUCATION ===
   === CERTIFICATIONS ===
   === VOLUNTEER ===
   === LANGUAGES ===

Format for each section:

=== SUMMARY ===
A 2-3 sentence tailored professional summary highlighting relevant experience and matching the JD keywords.

=== SKILLS ===
List skills category-by-category, one per line. Format:
Category Name: Skill 1, Skill 2, Skill 3
(e.g., Languages: Python, JavaScript
AI & Machine Learning: OpenCV, Scikit-Learn
Backend & Frameworks: FastAPI, Node.js)

=== EXPERIENCE ===
Format every job entry exactly as:
Job Title | Company Name | Location | Duration
- Bullet point 1 (Mirror JD keywords, reference real achievements)
- Bullet point 2 (Mirror JD keywords, reference real achievements)
Separate multiple job entries with an empty line.

=== PROJECTS ===
Format every project entry exactly as:
Project Name | Duration | Technologies Used
- Bullet point 1 (Mirror JD keywords, reference real achievements)
- Bullet point 2 (Mirror JD keywords, reference real achievements)
Separate multiple project entries with an empty line.

=== EDUCATION ===
Format every education entry exactly as:
Degree | Institution | Duration | Note
(e.g., Bachelor of Science — Computer Science | COMSATS University Islamabad, Lahore Campus | Sep 2023 – Present | 6th Semester)

=== CERTIFICATIONS ===
Format each certification on a new line:
- Certification Name | Issuer | Date
(e.g., - Supervised Machine Learning (Regression & Classification) | Stanford Online / Coursera | Aug 2025)

=== VOLUNTEER ===
Format every volunteer entry exactly as:
Role | Organization | Duration
- Description of contribution

=== LANGUAGES ===
Format each language on a new line:
- Language | Level
"""

RESUME_USER_PROMPT_TEMPLATE = """
Candidate Profile:
{profile_text}

Target Job Description:
{jd}

Generate the tailored resume in plain text.

CRITICAL FINAL REMINDER: 
1. You MUST include ALL sections (Summary, Skills, Experience, Projects, Education, Certifications, Volunteer, Languages).
2. You MUST include ALL projects, ALL jobs, and ALL education entries listed in the candidate profile. Do NOT skip any of them.
3. For every experience, project, and volunteer entry, you MUST include ALL of the corresponding bullet points from the profile. You may modify them slightly to tailors keywords to the JD, but you MUST NOT skip or summarize any bullet points. Every single bullet point must be written out.
4. Do NOT shorten the resume or skip details. Do NOT use placeholders. 
5. Output only the plaintext resume with the === SECTION_NAME === markers. Do not wrap in markdown tags.
"""

COVER_LETTER_SYSTEM_PROMPT = """
You are a professional cover letter writer. Your job is to write a highly tailored cover letter.

Output Requirements:
1. Return ONLY a valid JSON object matching the JSON schema below. Do not include markdown code block formatting (like ```json ... ```), just the raw JSON.
2. Structure the letter into four paragraphs:
   - Paragraph 1 (Opening): State the position applied for, target company name, and express enthusiasm.
   - Paragraph 2 (Technical Experience): Mention 2-3 specific projects from Ahmad's profile (like LUMINA, Intelligent Emotion Detection, or AI Face Recognition) that fit the job.
   - Paragraph 3 (Soft Skills & Value): Emphasize fast learning, teamwork, and how internship experience at WEBBUGGS prepared him to deliver results.
   - Paragraph 4 (Closing): Professional wrap-up, call to action, and link to GitHub/LinkedIn.
3. Reference the company name explicitly.

JSON Schema:
{
  "date": "May 31, 2026",
  "recipient_company": "Company Name",
  "subject": "Application for [Job Title]",
  "salutation": "Dear Hiring Team,",
  "paragraphs": [
    "Paragraph 1 text",
    "Paragraph 2 text",
    "Paragraph 3 text",
    "Paragraph 4 text"
  ],
  "sign_off": "Sincerely,\\n\\nAhmad Sheraz"
}
"""

COVER_LETTER_USER_PROMPT_TEMPLATE = """
Candidate Profile:
{profile_json}

Target Company Name: {company_name}
Target Job Description:
{jd}

Generate the tailored cover letter JSON following the strict schema.
"""

QA_SYSTEM_PROMPT = """
You are a helpful AI assistant supporting a candidate, Ahmad Sheraz, with job application questions.
You are given the Candidate Profile, the target Job Description, and a specific application question.

Instructions:
1. Read the question text to auto-detect any character limits, word limits, or sentence counts.
   Examples of limit patterns:
   - "max 500 characters" / "500 chars limit"
   - "in 100 words or less" / "under 150 words"
   - "in 2-3 sentences"
2. Write a highly professional response that answers the question accurately using Ahmad's real projects and skills.
3. Keep the answer strictly within the detected limit if one exists.
4. Output ONLY the copy-paste ready answer text. Do not include any intros (like "Here is the answer:") or explanation.
"""

QA_USER_PROMPT_TEMPLATE = """
Candidate Profile:
{profile_json}

Target Job Description:
{jd}

Application Question:
{question}

Provide the copy-paste ready response.
"""
