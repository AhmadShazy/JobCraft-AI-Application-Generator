import os
import pytest
from docx import Document

import backend.generator as g

RESUME = """=== TAGLINE ===
ML Engineer | Vision
=== SUMMARY ===
Built and shipped things.
=== SKILLS ===
Languages: Python, JS
=== EXPERIENCE ===
Engineer | Acme | Remote | 2023-2024
- Engineered a pipeline that cut latency 40%.
=== EDUCATION ===
BS CS | MIT | 2019-2023 | GPA 3.9
Relevant Coursework: Algorithms, ML
=== VOLUNTEER ===
Mentor | CodeClub | 2022
- Mentored students in Python.
=== LANGUAGES ===
- English | Native
"""

COVER_OK = {
    "date": "x", "recipient_company": "Acme", "subject": "s", "salutation": "Dear",
    "paragraphs": ["Para one.", "Para two."], "sign_off": "Sincerely,\nJane",
}


def test_resume_generates(tmp_path):
    out = tmp_path / "r.docx"
    g.generate_resume_docx(RESUME, {"name": "Jane Doe", "email": "j@x.com"}, str(out))
    assert out.exists() and out.stat().st_size > 0


def test_resume_empty_output_raises(tmp_path):
    with pytest.raises(ValueError):
        g.generate_resume_docx("I cannot help with that.", {"name": "Jane"}, str(tmp_path / "e.docx"))


def test_resume_name_fallback_is_neutral(tmp_path):
    out = tmp_path / "n.docx"
    g.generate_resume_docx(RESUME, {}, str(out))
    doc = Document(str(out))
    assert doc.paragraphs[0].text == "Candidate"  # never a hardcoded real name


def test_cover_letter_ok(tmp_path):
    out = tmp_path / "cl.docx"
    g.generate_cover_letter_docx(COVER_OK, "Jane", "j@x.com", "123", [], str(out))
    assert out.exists()


@pytest.mark.parametrize("bad", [
    {"paragraphs": "a string, not a list"},
    {"no_paragraphs": True},
    {"paragraphs": []},
    {"paragraphs": [""]},
])
def test_cover_letter_invalid_shape_raises(tmp_path, bad):
    with pytest.raises(ValueError):
        g.generate_cover_letter_docx(bad, "Jane", "j@x.com", "123", [], str(tmp_path / "b.docx"))
