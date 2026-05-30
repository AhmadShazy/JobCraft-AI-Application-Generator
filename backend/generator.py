import os
import json
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_margins(doc, margin_in_inches=1.0):
    """Sets standard margins on all sections of the document."""
    for section in doc.sections:
        section.top_margin = Inches(margin_in_inches)
        section.bottom_margin = Inches(margin_in_inches)
        section.left_margin = Inches(margin_in_inches)
        section.right_margin = Inches(margin_in_inches)

def add_bottom_border(paragraph):
    """Adds a clean bottom border line to a heading paragraph (classic resume divider)."""
    pPr = paragraph._p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6')  # 6/8 pt size
    bottom.set(qn('w:space'), '2')
    bottom.set(qn('w:color'), '000000')  # Solid Black
    pBdr.append(bottom)
    pPr.append(pBdr)

def apply_font_settings(run, name="Arial", size_pt=10, color_rgb=(0, 0, 0), bold=False, italic=False):
    """Applies font styles to a run."""
    run.font.name = name
    run.font.size = Pt(size_pt)
    run.font.color.rgb = RGBColor(*color_rgb)
    run.bold = bold
    run.italic = italic

def generate_resume_docx(resume_data: dict, output_path: str):
    """
    Generates an ATS-friendly tailored resume in .docx format.
    Uses Arial, black-only color scheme, standard 1-inch margins,
    and a clean single-column structure.
    """
    doc = Document()
    set_margins(doc, 1.0)
    
    # Page printable width is 8.5" (letter width) - 2" (margins) = 6.5"
    # Set up a right tab-stop at 6.5" for aligning dates/durations
    right_tab_stop_position = Inches(6.5)

    # 1. Header (Name and Contact Info)
    name_p = doc.add_paragraph()
    name_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    name_p.paragraph_format.space_after = Pt(2)
    name_run = name_p.add_run(resume_data.get("name", "Ahmad Sheraz"))
    apply_font_settings(name_run, size_pt=16, bold=True)

    contact = resume_data.get("contact", {})
    email = contact.get("email", "")
    phone = contact.get("phone", "")
    location = contact.get("location", "")
    links = contact.get("links", [])
    
    contact_parts = [email, phone, location] + links
    contact_text = " | ".join([p for p in contact_parts if p])
    
    contact_p = doc.add_paragraph()
    contact_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    contact_p.paragraph_format.space_after = Pt(12)
    contact_run = contact_p.add_run(contact_text)
    apply_font_settings(contact_run, size_pt=9.5)

    # 2. Professional Summary
    if resume_data.get("summary"):
        summary_title_p = doc.add_paragraph()
        summary_title_p.paragraph_format.space_before = Pt(8)
        summary_title_p.paragraph_format.space_after = Pt(4)
        add_bottom_border(summary_title_p)
        title_run = summary_title_p.add_run("PROFESSIONAL SUMMARY")
        apply_font_settings(title_run, size_pt=11.5, bold=True)

        summary_p = doc.add_paragraph()
        summary_p.paragraph_format.space_after = Pt(8)
        summary_p.paragraph_format.line_spacing = 1.15
        summary_run = summary_p.add_run(resume_data["summary"])
        apply_font_settings(summary_run, size_pt=10)

    # 3. Technical Skills
    skills_data = resume_data.get("skills", {})
    if skills_data:
        skills_title_p = doc.add_paragraph()
        skills_title_p.paragraph_format.space_before = Pt(8)
        skills_title_p.paragraph_format.space_after = Pt(4)
        add_bottom_border(skills_title_p)
        title_run = skills_title_p.add_run("TECHNICAL SKILLS")
        apply_font_settings(title_run, size_pt=11.5, bold=True)

        # Mapping key display names to profile data keys
        skill_categories = [
            ("Languages", "languages"),
            ("AI & Machine Learning", "ai_ml"),
            ("Backend & Frameworks", "backend_and_apis"),
            ("Databases", "databases"),
            ("Tools & Platforms", "tools_and_platforms")
        ]

        for display_name, key in skill_categories:
            items = skills_data.get(key, [])
            if not items:
                if key == "backend_and_apis":
                    items = skills_data.get("backend", [])
                elif key == "tools_and_platforms":
                    items = skills_data.get("tools", [])
            
            if items:
                skill_p = doc.add_paragraph()
                skill_p.paragraph_format.space_after = Pt(3)
                skill_p.paragraph_format.line_spacing = 1.1
                
                cat_run = skill_p.add_run(f"{display_name}: ")
                apply_font_settings(cat_run, size_pt=10, bold=True)
                
                list_run = skill_p.add_run(", ".join(items))
                apply_font_settings(list_run, size_pt=10)

    # 4. Professional Experience
    experience_data = resume_data.get("experience", [])
    if experience_data:
        exp_title_p = doc.add_paragraph()
        exp_title_p.paragraph_format.space_before = Pt(10)
        exp_title_p.paragraph_format.space_after = Pt(4)
        add_bottom_border(exp_title_p)
        title_run = exp_title_p.add_run("PROFESSIONAL EXPERIENCE")
        apply_font_settings(title_run, size_pt=11.5, bold=True)

        for job in experience_data:
            # Title & Duration with right tab stop
            job_p = doc.add_paragraph()
            job_p.paragraph_format.tab_stops.add_tab_stop(right_tab_stop_position, WD_TAB_ALIGNMENT.RIGHT)
            job_p.paragraph_format.space_before = Pt(4)
            job_p.paragraph_format.space_after = Pt(1)

            title_company = f"{job.get('title', '')} – {job.get('company', '')}"
            title_run = job_p.add_run(title_company)
            apply_font_settings(title_run, size_pt=10.5, bold=True)

            # Tab over to right align the duration
            duration_run = job_p.add_run(f"\t{job.get('duration', '')}")
            apply_font_settings(duration_run, size_pt=10, bold=True)

            # Location (Sub-line)
            if job.get("location"):
                loc_p = doc.add_paragraph()
                loc_p.paragraph_format.space_after = Pt(2)
                loc_run = loc_p.add_run(job["location"])
                apply_font_settings(loc_run, size_pt=9.5, italic=True)

            # Bullets
            for bullet in job.get("bullets", []):
                bullet_p = doc.add_paragraph(style='List Bullet')
                bullet_p.paragraph_format.space_after = Pt(2)
                bullet_p.paragraph_format.line_spacing = 1.1
                bullet_run = bullet_p.add_run(bullet)
                apply_font_settings(bullet_run, size_pt=10)

    # 5. Projects
    projects_data = resume_data.get("projects", [])
    if projects_data:
        proj_title_p = doc.add_paragraph()
        proj_title_p.paragraph_format.space_before = Pt(10)
        proj_title_p.paragraph_format.space_after = Pt(4)
        add_bottom_border(proj_title_p)
        title_run = proj_title_p.add_run("PROJECTS")
        apply_font_settings(title_run, size_pt=11.5, bold=True)

        for proj in projects_data:
            proj_p = doc.add_paragraph()
            proj_p.paragraph_format.tab_stops.add_tab_stop(right_tab_stop_position, WD_TAB_ALIGNMENT.RIGHT)
            proj_p.paragraph_format.space_before = Pt(4)
            proj_p.paragraph_format.space_after = Pt(1)

            name_run = proj_p.add_run(proj.get("name", ""))
            apply_font_settings(name_run, size_pt=10.5, bold=True)

            duration_run = proj_p.add_run(f"\t{proj.get('duration', '')}")
            apply_font_settings(duration_run, size_pt=10, bold=True)

            # Stack sub-line
            if proj.get("stack"):
                stack_p = doc.add_paragraph()
                stack_p.paragraph_format.space_after = Pt(2)
                stack_run = stack_p.add_run(f"Technologies: {proj['stack']}")
                apply_font_settings(stack_run, size_pt=9.5, italic=True)

            # Bullets
            for bullet in proj.get("bullets", []):
                bullet_p = doc.add_paragraph(style='List Bullet')
                bullet_p.paragraph_format.space_after = Pt(2)
                bullet_p.paragraph_format.line_spacing = 1.1
                bullet_run = bullet_p.add_run(bullet)
                apply_font_settings(bullet_run, size_pt=10)

    # 6. Education
    edu_data = resume_data.get("education", [])
    if edu_data:
        edu_title_p = doc.add_paragraph()
        edu_title_p.paragraph_format.space_before = Pt(10)
        edu_title_p.paragraph_format.space_after = Pt(4)
        add_bottom_border(edu_title_p)
        title_run = edu_title_p.add_run("EDUCATION")
        apply_font_settings(title_run, size_pt=11.5, bold=True)

        for edu in edu_data:
            edu_p = doc.add_paragraph()
            edu_p.paragraph_format.tab_stops.add_tab_stop(right_tab_stop_position, WD_TAB_ALIGNMENT.RIGHT)
            edu_p.paragraph_format.space_before = Pt(3)
            edu_p.paragraph_format.space_after = Pt(1)

            edu_run = edu_p.add_run(edu.get("degree", ""))
            apply_font_settings(edu_run, size_pt=10.5, bold=True)

            duration_run = edu_p.add_run(f"\t{edu.get('duration', '')}")
            apply_font_settings(duration_run, size_pt=10, bold=True)

            inst_p = doc.add_paragraph()
            inst_p.paragraph_format.space_after = Pt(2)
            inst_text = edu.get("institution", "")
            if edu.get("note"):
                inst_text += f" ({edu['note']})"
            inst_run = inst_p.add_run(inst_text)
            apply_font_settings(inst_run, size_pt=10, italic=True)

    # 7. Certifications
    certs_data = resume_data.get("certifications", [])
    if certs_data:
        cert_title_p = doc.add_paragraph()
        cert_title_p.paragraph_format.space_before = Pt(10)
        cert_title_p.paragraph_format.space_after = Pt(4)
        add_bottom_border(cert_title_p)
        title_run = cert_title_p.add_run("CERTIFICATIONS")
        apply_font_settings(title_run, size_pt=11.5, bold=True)

        for cert in certs_data:
            cert_p = doc.add_paragraph(style='List Bullet')
            cert_p.paragraph_format.space_after = Pt(2)
            if isinstance(cert, dict):
                text = f"{cert.get('name', '')} – {cert.get('issuer', '')} ({cert.get('date', '')})"
            else:
                text = str(cert)
            cert_run = cert_p.add_run(text)
            apply_font_settings(cert_run, size_pt=10)

    # 8. Volunteer Work
    vol_data = resume_data.get("volunteer", [])
    if vol_data:
        vol_title_p = doc.add_paragraph()
        vol_title_p.paragraph_format.space_before = Pt(10)
        vol_title_p.paragraph_format.space_after = Pt(4)
        add_bottom_border(vol_title_p)
        title_run = vol_title_p.add_run("VOLUNTEER EXPERIENCE")
        apply_font_settings(title_run, size_pt=11.5, bold=True)

        for vol in vol_data:
            if isinstance(vol, dict):
                vol_p = doc.add_paragraph()
                vol_p.paragraph_format.tab_stops.add_tab_stop(right_tab_stop_position, WD_TAB_ALIGNMENT.RIGHT)
                vol_p.paragraph_format.space_before = Pt(3)
                vol_p.paragraph_format.space_after = Pt(1)

                role_org = f"{vol.get('role', '')} – {vol.get('organization', '')}"
                role_run = vol_p.add_run(role_org)
                apply_font_settings(role_run, size_pt=10.5, bold=True)

                duration_run = vol_p.add_run(f"\t{vol.get('duration', '')}")
                apply_font_settings(duration_run, size_pt=10, bold=True)

                for bullet in vol.get("bullets", []):
                    bullet_p = doc.add_paragraph(style='List Bullet')
                    bullet_p.paragraph_format.space_after = Pt(2)
                    bullet_p.paragraph_format.line_spacing = 1.1
                    bullet_run = bullet_p.add_run(bullet)
                    apply_font_settings(bullet_run, size_pt=10)
            else:
                vol_p = doc.add_paragraph(style='List Bullet')
                vol_p.paragraph_format.space_after = Pt(2)
                vol_run = vol_p.add_run(str(vol))
                apply_font_settings(vol_run, size_pt=10)

    # 9. Languages
    lang_data = resume_data.get("languages", [])
    if lang_data:
        lang_title_p = doc.add_paragraph()
        lang_title_p.paragraph_format.space_before = Pt(10)
        lang_title_p.paragraph_format.space_after = Pt(4)
        add_bottom_border(lang_title_p)
        title_run = lang_title_p.add_run("LANGUAGES")
        apply_font_settings(title_run, size_pt=11.5, bold=True)

        lang_strings = []
        for lang in lang_data:
            if isinstance(lang, dict):
                lang_strings.append(f"{lang.get('language', '')} ({lang.get('level', '')})")
            else:
                lang_strings.append(str(lang))

        lang_p = doc.add_paragraph()
        lang_p.paragraph_format.space_after = Pt(8)
        lang_run = lang_p.add_run(", ".join(lang_strings))
        apply_font_settings(lang_run, size_pt=10)

    # Make parent directories if they don't exist
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)


def generate_cover_letter_docx(cl_data: dict, name: str, email: str, phone: str, links: list, output_path: str):
    """
    Generates a professional cover letter in .docx format.
    Uses Arial, black-only color scheme, standard 1-inch margins.
    Formatted as block paragraphs (no indent, with spaces between paragraphs).
    """
    doc = Document()
    set_margins(doc, 1.0)

    # 1. Header (Left-aligned)
    header_p = doc.add_paragraph()
    header_p.paragraph_format.space_after = Pt(2)
    name_run = header_p.add_run(name)
    apply_font_settings(name_run, size_pt=12, bold=True)

    info_p = doc.add_paragraph()
    info_p.paragraph_format.space_after = Pt(18)
    contact_info = f"Email: {email} | Phone: {phone}"
    if links:
        contact_info += " | " + " | ".join(links)
    info_run = info_p.add_run(contact_info)
    apply_font_settings(info_run, size_pt=9.5)

    # 2. Date
    date_p = doc.add_paragraph()
    date_p.paragraph_format.space_after = Pt(12)
    date_run = date_p.add_run(cl_data.get("date", "May 31, 2026"))
    apply_font_settings(date_run, size_pt=10)

    # 3. Recipient
    rec_p = doc.add_paragraph()
    rec_p.paragraph_format.space_after = Pt(12)
    rec_run = rec_p.add_run(f"To,\nThe Hiring Team\n{cl_data.get('recipient_company', 'Target Company')}")
    apply_font_settings(rec_run, size_pt=10)

    # 4. Subject line
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_after = Pt(12)
    sub_run = sub_p.add_run(cl_data.get("subject", "RE: Application for Position"))
    apply_font_settings(sub_run, size_pt=10, bold=True)

    # 5. Salutation
    sal_p = doc.add_paragraph()
    sal_p.paragraph_format.space_after = Pt(12)
    sal_run = sal_p.add_run(cl_data.get("salutation", "Dear Hiring Team,"))
    apply_font_settings(sal_run, size_pt=10)

    # 6. Body Paragraphs
    for para_text in cl_data.get("paragraphs", []):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(12)
        p.paragraph_format.line_spacing = 1.15
        p_run = p.add_run(para_text)
        apply_font_settings(p_run, size_pt=10)

    # 7. Sign-off
    sign_p = doc.add_paragraph()
    sign_p.paragraph_format.space_before = Pt(12)
    sign_run = sign_p.add_run(cl_data.get("sign_off", f"Sincerely,\n\n{name}"))
    apply_font_settings(sign_run, size_pt=10)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc.save(output_path)
