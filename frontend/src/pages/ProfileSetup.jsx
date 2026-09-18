import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { normalizeProfile, saveProfile } from '../api/client';
import { User, BookOpen, FileText, CheckSquare, Sparkles, Loader2, Plus, Trash2, ArrowRight, ArrowLeft, Sun, Moon } from 'lucide-react';

const CATEGORY_LABELS = {
  languages: 'Languages',
  ai_ml: 'AI / ML',
  backend_and_apis: 'Backend & APIs',
  databases: 'Databases',
  tools_and_platforms: 'Tools & Platforms',
  concepts: 'Concepts',
};

// Wizard progress is mirrored to localStorage so a refresh, tab close, or session
// expiry mid-setup doesn't wipe everything the user typed.
const DRAFT_KEY = 'jobcraft_setup_draft_v1';

const DEFAULT_DRAFT = {
  step: 1,
  basicInfo: { name: '', email: '', phone: '', location: '', linkedin: '', github: '', portfolio: '', tagline: '' },
  languages: [{ language: 'English', level: 'Proficient' }],
  educations: [{ institution: '', degree: 'Bachelor of Science', field: 'Computer Science', duration: '', note: '' }],
  experience: '', skills: '', projects: '', certifications: '', volunteer: '', additionalInfo: '',
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return DEFAULT_DRAFT;
    return { ...DEFAULT_DRAFT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_DRAFT;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch { /* storage unavailable */ }
}

function ProfileSetup({ darkMode, toggleDarkMode }) {
  const { setProfileComplete, logout } = useAuth();
  const { addToast } = useToast();

  // Initialise once from any saved draft.
  const [draft] = useState(loadDraft);
  const [step, setStep] = useState(draft.step);
  const [loading, setLoading] = useState(false);

  const handleBackToCredentials = async () => {
    const ok = window.confirm(
      'Go back to the login screen? Your progress is saved as a draft and will be restored when you return.'
    );
    if (!ok) return;
    setLoading(true);
    try {
      await logout();
    } catch (err) {
      console.error(err);
      addToast("Failed to return to credentials screen.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Normalized profile preview state
  const [normalizedPreview, setNormalizedPreview] = useState(null);

  // Step 1: Basic Info
  const [basicInfo, setBasicInfo] = useState(draft.basicInfo);
  const [languages, setLanguages] = useState(draft.languages);

  // Step 2: Education
  const [educations, setEducations] = useState(draft.educations);

  // Step 3: Free Text
  const [experience, setExperience] = useState(draft.experience);
  const [skills, setSkills] = useState(draft.skills);
  const [projects, setProjects] = useState(draft.projects);
  const [certifications, setCertifications] = useState(draft.certifications);
  const [volunteer, setVolunteer] = useState(draft.volunteer);
  const [additionalInfo, setAdditionalInfo] = useState(draft.additionalInfo);

  // Persist progress to localStorage on any change.
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        step, basicInfo, languages, educations,
        experience, skills, projects, certifications, volunteer, additionalInfo,
      }));
    } catch { /* storage unavailable */ }
  }, [step, basicInfo, languages, educations, experience, skills, projects, certifications, volunteer, additionalInfo]);

  // Handle Basic Info inputs
  const handleBasicChange = (e) => {
    setBasicInfo({ ...basicInfo, [e.target.name]: e.target.value });
  };

  // Add/Remove Languages
  const addLanguage = () => {
    setLanguages([...languages, { language: '', level: 'Basic' }]);
  };
  const removeLanguage = (index) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };
  const handleLanguageChange = (index, field, value) => {
    // Replace the element object rather than mutating it in place.
    setLanguages(languages.map((lang, i) => (i === index ? { ...lang, [field]: value } : lang)));
  };

  // Add/Remove Education
  const addEducation = () => {
    setEducations([...educations, { institution: '', degree: '', field: '', duration: '', note: '' }]);
  };
  const removeEducation = (index) => {
    setEducations(educations.filter((_, i) => i !== index));
  };
  const handleEducationChange = (index, field, value) => {
    setEducations(educations.map((edu, i) => (i === index ? { ...edu, [field]: value } : edu)));
  };

  // Step 1 Validation
  const validateStep1 = () => {
    const { name, email, phone, location } = basicInfo;
    if (!name.trim() || !email.trim() || !phone.trim() || !location.trim()) {
      addToast('Please fill in all required fields before continuing.', 'error');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    const valid = educations.every(edu => edu.institution.trim() && edu.degree.trim() && edu.duration.trim());
    if (!valid || educations.length === 0) {
      addToast('Please fill in all required fields before continuing.', 'error');
      return false;
    }
    return true;
  };

  // Step 3 Validation — don't spend a Gemini call (and save an empty profile) with
  // no substantive background at all.
  const validateStep3 = () => {
    const hasContent = [experience, skills, projects, certifications, volunteer].some(t => t.trim());
    if (!hasContent) {
      addToast('Add at least your skills or work experience before running the AI step.', 'error');
      return false;
    }
    return true;
  };

  // Proceed steps
  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;

    if (step === 3) {
      setStep(4);
      triggerNormalization();
    } else {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  // Normalize profile via Gemini
  const triggerNormalization = async () => {
    setLoading(true);
    try {
      // Assemble languages into basic info payload or pass separately
      const payload = {
        basic_info: {
          ...basicInfo,
          languages: languages.filter(l => l.language.trim())
        },
        education: educations,
        experience,
        skills,
        projects,
        certifications,
        volunteer,
        additional_info: additionalInfo
      };

      const result = await normalizeProfile(payload);
      setNormalizedPreview(result);
    } catch (err) {
      console.error(err);
      addToast(
        err.response?.data?.detail || 
        'Gemini normalization failed. Please return to Step 3 and clarify your inputs.',
        'error'
      );
      setStep(3); // bounce back to text fields on normalization error
    } finally {
      setLoading(false);
    }
  };

  // Save confirmed profile
  const handleConfirmSave = async () => {
    if (!normalizedPreview) return;
    setLoading(true);
    try {
      // The form fields are authoritative — overlay them so a required field the
      // model happened to drop during normalization can't leave the saved profile
      // incomplete (which would silently bounce the user back into the wizard).
      const finalProfile = {
        ...normalizedPreview,
        name: basicInfo.name,
        email: basicInfo.email,
        phone: basicInfo.phone,
        location: basicInfo.location,
        linkedin: basicInfo.linkedin,
        github: basicInfo.github,
        portfolio: basicInfo.portfolio,
        tagline: normalizedPreview.tagline || basicInfo.tagline,
        languages: (normalizedPreview.languages && normalizedPreview.languages.length)
          ? normalizedPreview.languages
          : languages.filter(l => l.language.trim()),
        education: (normalizedPreview.education && normalizedPreview.education.length)
          ? normalizedPreview.education
          : educations,
      };

      const res = await saveProfile(finalProfile);
      // Honour the server's authoritative completeness verdict rather than assuming true.
      if (res.profile_complete) {
        clearDraft();
        setProfileComplete(true); // Redirection triggered via App.jsx state
      } else {
        addToast(
          'Your profile is still missing a required field (name, email, phone, location, or education). Please review Steps 1–2.',
          'error'
        );
        setStep(1);
      }
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Failed to save candidate profile details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col select-none relative overflow-hidden transition-colors duration-200">
      
      {/* Background Accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-60 bg-gradient-to-b from-primary-500/5 to-transparent blur-3xl pointer-events-none"></div>

      {/* Header section (fixed at top): Title + Stepper */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-6 pb-2 flex-shrink-0 z-10">
        {/* Title */}
        <div className="flex justify-between items-center mb-4">
          <div className="w-10"></div> {/* Spacer */}
          <div className="text-center">
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-500 dark:from-accent-400 dark:to-cyan-300 bg-clip-text text-transparent flex items-center justify-center gap-2">
              <Sparkles className="w-[22px] h-[22px] shrink-0 text-accent-500 dark:text-accent-400 animate-pulse" />
              Candidate Profile Setup
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-semibold text-xs mt-0.5">Let's build your professional profile. v2.0</p>
          </div>
          <button
            type="button"
            onClick={toggleDarkMode}
            className="flex items-center justify-center p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" /> : <Moon className="w-4 h-4 text-accent-500" />}
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Basic Info', icon: User },
            { label: 'Education', icon: BookOpen },
            { label: 'Background Detail', icon: FileText },
            { label: 'AI Review', icon: CheckSquare },
          ].map((s, idx) => {
            const Icon = s.icon;
            const active = step === idx + 1;
            const completed = step > idx + 1;
            return (
              <div 
                key={idx}
                className={`flex flex-col items-center py-2 rounded-xl border transition-all duration-200 ${
                  active 
                    ? 'bg-accent-50 dark:bg-slate-900/60 border-accent-500/80 dark:border-accent-500 text-accent-600 dark:text-accent-300 font-bold shadow-sm'
                    : completed 
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/5' 
                    : 'bg-slate-100/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[11px] font-bold hidden md:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle scrollable content area */}
      <div className="flex-1 w-full max-w-4xl mx-auto px-4 overflow-y-auto z-10 pb-6 pt-2">
        <div className="bg-cyan-100/40 dark:bg-slate-900/40 backdrop-blur-md border border-accent-200/60 dark:border-slate-800 border-t-4 border-t-accent-500 rounded-2xl shadow-md p-6 md:p-8 min-h-full">
          
          {/* Step Views */}
          <div className="h-full">
          
          {/* STEP 1: BASIC INFO */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-slate-50 via-slate-50 to-cyan-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40 p-4 rounded-xl border border-cyan-100/60 dark:border-slate-800 mb-6">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Step 1 — Basic Credentials</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Name *</label>
                  <input type="text" name="name" value={basicInfo.name} onChange={handleBasicChange} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. Ahmad Sheraz" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address *</label>
                  <input type="email" name="email" value={basicInfo.email} onChange={handleBasicChange} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. email@example.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phone Number *</label>
                  <input type="text" name="phone" value={basicInfo.phone} onChange={handleBasicChange} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. +92-3287537973" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Location (City, Country) *</label>
                  <input type="text" name="location" value={basicInfo.location} onChange={handleBasicChange} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. Lahore, Pakistan" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">LinkedIn URL</label>
                  <input type="text" name="linkedin" value={basicInfo.linkedin} onChange={handleBasicChange} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="linkedin.com/in/username" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">GitHub URL</label>
                  <input type="text" name="github" value={basicInfo.github} onChange={handleBasicChange} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="github.com/username" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Portfolio Website</label>
                  <input type="text" name="portfolio" value={basicInfo.portfolio} onChange={handleBasicChange} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. testuser.dev" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Headline / Tagline</label>
                  <input type="text" name="tagline" value={basicInfo.tagline} onChange={handleBasicChange} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. AI/ML Engineer | Backend Developer" />
                </div>
              </div>

              {/* Languages Section */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center border-b border-slate-200/80 dark:border-slate-800 pb-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Languages & Proficiency</label>
                  <button type="button" onClick={addLanguage} className="flex items-center gap-1 text-xs font-bold text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors cursor-pointer">
                    <Plus className="w-3.5 h-3.5" /> Add Language
                  </button>
                </div>
                {languages.map((lang, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-fade-in">
                    <input type="text" value={lang.language} onChange={(e) => handleLanguageChange(idx, 'language', e.target.value)} className="flex-1 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. English" />
                    <select value={lang.level} onChange={(e) => handleLanguageChange(idx, 'level', e.target.value)} className="w-40 py-1.5 px-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all">
                      <option value="Native">Native</option>
                      <option value="Fluent">Fluent</option>
                      <option value="Proficient">Proficient</option>
                      <option value="Basic">Basic</option>
                    </select>
                    {languages.length > 1 && (
                      <button type="button" onClick={() => removeLanguage(idx)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: EDUCATION */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gradient-to-r from-slate-50 via-slate-50 to-cyan-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40 p-4 rounded-xl border border-cyan-100/60 dark:border-slate-800 mb-6">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Step 2 — Education Timeline *</h2>
                <button type="button" onClick={addEducation} className="flex items-center gap-1 text-xs font-bold text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 transition-colors cursor-pointer">
                  <Plus className="w-3.5 h-3.5" /> Add Education
                </button>
              </div>

              <div className="space-y-6">
                {educations.map((edu, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-cyan-100/60 dark:border-slate-800 rounded-xl space-y-4 relative animate-fade-in">
                    {educations.length > 1 && (
                      <button type="button" onClick={() => removeEducation(idx)} className="absolute top-2 right-2 p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Institution Name *</label>
                        <input type="text" value={edu.institution} onChange={(e) => handleEducationChange(idx, 'institution', e.target.value)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. COMSATS University Islamabad" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Degree *</label>
                          <input type="text" value={edu.degree} onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. BS" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Field of Study</label>
                          <input type="text" value={edu.field} onChange={(e) => handleEducationChange(idx, 'field', e.target.value)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. Computer Science" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Duration (Start - End) *</label>
                        <input type="text" value={edu.duration} onChange={(e) => handleEducationChange(idx, 'duration', e.target.value)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. Sep 2023 – Present" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Additional Note (Optional)</label>
                        <input type="text" value={edu.note} onChange={(e) => handleEducationChange(idx, 'note', e.target.value)} className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="e.g. GPA: 3.8, 6th Semester" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: FREE TEXT BACKGROUND DETAIL */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-slate-50 via-slate-50 to-cyan-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40 p-4 rounded-xl border border-cyan-100/60 dark:border-slate-800 mb-6">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">Step 3 — Professional Background Details</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">Paste your raw text per section. Gemini will normalize them into a structured candidate profile.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Work Experience</span>
                    <span className="text-slate-400 dark:text-slate-500">{experience.length} chars</span>
                  </div>
                  <textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows="3" className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="Paste your work history here, listing roles, companies, locations, and achievements..."></textarea>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Skills List</span>
                    <span className="text-slate-400 dark:text-slate-500">{skills.length} chars</span>
                  </div>
                  <textarea value={skills} onChange={(e) => setSkills(e.target.value)} rows="2" className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="List your technical skills, programming languages, databases, or conceptual experience..."></textarea>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Key Projects</span>
                    <span className="text-slate-400 dark:text-slate-500">{projects.length} chars</span>
                  </div>
                  <textarea value={projects} onChange={(e) => setProjects(e.target.value)} rows="3" className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="List any notable academic, personal, or research projects, including technologies used..."></textarea>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Certifications</span>
                    <span className="text-slate-400 dark:text-slate-500">{certifications.length} chars</span>
                  </div>
                  <textarea value={certifications} onChange={(e) => setCertifications(e.target.value)} rows="2" className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="E.g., Stanford Machine Learning (Aug 2025), IBM Artificial Intelligence (Jul 2025)..."></textarea>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Volunteering & Extras</span>
                    <span className="text-slate-400 dark:text-slate-500">{volunteer.length} chars</span>
                  </div>
                  <textarea value={volunteer} onChange={(e) => setVolunteer(e.target.value)} rows="2" className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="Any community work, extracurricular actions, or programming communities you coached..."></textarea>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>Additional Context (Optional)</span>
                    <span className="text-slate-400 dark:text-slate-500">{additionalInfo.length} chars</span>
                  </div>
                  <textarea value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} rows="2" className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 focus:border-accent-500 transition-all" placeholder="Any additional context you would like the AI assistant to know about you (e.g. hobbies, preferences)..."></textarea>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & CONFIRM */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gradient-to-r from-slate-50 via-slate-50 to-cyan-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/40 p-4 rounded-xl border border-cyan-100/60 dark:border-slate-800 mb-6">
                <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-[18px] h-[18px] text-accent-500 dark:text-accent-400 animate-pulse" />
                  Step 4 — AI Normalization Review
                </h2>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <Loader2 className="w-10 h-10 text-accent-500 animate-spin" />
                  <div className="text-slate-800 dark:text-slate-100 font-bold">Gemini is structuring your profile...</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs text-center font-bold">Parsing unstructured text and categorizing details. Please hold.</div>
                </div>
              ) : normalizedPreview ? (
                <div className="space-y-6 animate-fade-in">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Please review the structured candidate card extracted by Gemini. Any missing sections are highlighted below.</p>
                  
                  {/* Basic Info Preview */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-cyan-100/60 dark:border-slate-800 rounded-xl space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Candidate Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="font-medium">Name: <span className="font-bold text-slate-800 dark:text-slate-100">{normalizedPreview.name || <span className="text-accent-500 text-xs font-bold">[Missing]</span>}</span></div>
                      <div className="font-medium">Email: <span className="font-bold text-slate-800 dark:text-slate-100">{normalizedPreview.email || <span className="text-accent-500 text-xs font-bold">[Missing]</span>}</span></div>
                      <div className="font-medium">Phone: <span className="font-bold text-slate-800 dark:text-slate-100">{normalizedPreview.phone || <span className="text-accent-500 text-xs font-bold">[Missing]</span>}</span></div>
                      <div className="font-medium">Location: <span className="font-bold text-slate-800 dark:text-slate-100">{normalizedPreview.location || <span className="text-accent-500 text-xs font-bold">[Missing]</span>}</span></div>
                    </div>
                  </div>

                  {/* Skills Categorized Preview */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-cyan-100/60 dark:border-slate-800 rounded-xl space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Categorized Skills</h3>
                    {normalizedPreview.skills && Object.keys(normalizedPreview.skills).some(k => normalizedPreview.skills[k]?.length > 0) ? (
                      <div className="space-y-2 text-sm">
                        {Object.entries(normalizedPreview.skills).map(([category, list]) => (
                          list && list.length > 0 && (
                            <div key={category} className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-slate-500 dark:text-slate-400 font-bold">{CATEGORY_LABELS[category] || category}:</span>
                              {list.map((s, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-accent-50 dark:bg-accent-950/40 rounded-full text-accent-600 dark:text-accent-300 border border-accent-100 dark:border-accent-800 font-bold">{s}</span>
                              ))}
                            </div>
                          )
                        ))}
                      </div>
                    ) : (
                      <div className="text-accent-500 text-xs font-bold">[No Skills Extracted]</div>
                    )}
                  </div>

                  {/* Projects and Experience Lists */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Experience List */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-cyan-100/60 dark:border-slate-800 rounded-xl space-y-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Work Experience</h3>
                      {normalizedPreview.experience && normalizedPreview.experience.length > 0 ? (
                        normalizedPreview.experience.map((exp, idx) => (
                          <div key={idx} className="text-xs space-y-1 pb-2 border-b border-slate-200/60 dark:border-slate-800 last:border-b-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{exp.title} at {exp.company}</div>
                            <div className="text-slate-500 dark:text-slate-400 font-bold">{exp.duration} | {exp.location}</div>
                            <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300 space-y-0.5 mt-1 font-medium">
                              {exp.bullets?.map((b, i) => <li key={i}>{b}</li>)}
                            </ul>
                          </div>
                        ))
                      ) : (
                        <div className="text-accent-500 text-xs font-bold">[No Experience Extracted]</div>
                      )}
                    </div>

                    {/* Projects List */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-cyan-100/60 dark:border-slate-800 rounded-xl space-y-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Featured Projects</h3>
                      {normalizedPreview.projects && normalizedPreview.projects.length > 0 ? (
                        normalizedPreview.projects.map((proj, idx) => (
                          <div key={idx} className="text-xs space-y-1 pb-2 border-b border-slate-200/60 dark:border-slate-800 last:border-b-0">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{proj.name} ({proj.type || 'Personal Project'})</div>
                            <div className="text-slate-500 dark:text-slate-400 font-bold">{proj.duration}</div>
                            <div className="text-primary-600 dark:text-accent-400 font-bold">Stack: {proj.stack}</div>
                            <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300 space-y-0.5 mt-1 font-medium">
                              {proj.bullets?.map((b, i) => <li key={i}>{b}</li>)}
                            </ul>
                          </div>
                        ))
                      ) : (
                        <div className="text-accent-500 text-xs font-bold">[No Projects Extracted]</div>
                      )}
                    </div>
                  </div>

                  {/* Certifications and Volunteering */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Certifications */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-cyan-100/60 dark:border-slate-800 rounded-xl space-y-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Certifications</h3>
                      {normalizedPreview.certifications && normalizedPreview.certifications.length > 0 ? (
                        normalizedPreview.certifications.map((c, i) => (
                          <div key={i} className="text-xs text-slate-600 dark:text-slate-300 font-medium">{c.name} — <span className="text-slate-500 dark:text-slate-400 font-bold">{c.issuer} ({c.date})</span></div>
                        ))
                      ) : (
                        <div className="text-accent-500 text-xs font-bold">[No Certifications Extracted]</div>
                      )}
                    </div>

                    {/* Volunteering */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-cyan-100/60 dark:border-slate-800 rounded-xl space-y-2">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Volunteer Work</h3>
                      {normalizedPreview.volunteer && normalizedPreview.volunteer.length > 0 ? (
                        normalizedPreview.volunteer.map((v, i) => (
                          <div key={i} className="text-xs space-y-1">
                            <div className="font-bold text-slate-800 dark:text-slate-100">{v.role} at {v.organization}</div>
                            <div className="text-slate-500 dark:text-slate-400 font-bold">{v.duration}</div>
                            <ul className="list-disc pl-4 text-slate-600 dark:text-slate-300 space-y-0.5 font-medium">
                              {v.bullets?.map((b, j) => <li key={j}>{b}</li>)}
                            </ul>
                          </div>
                        ))
                      ) : (
                        <div className="text-accent-500 text-xs font-bold">[No Volunteering Extracted]</div>
                      )}
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 font-bold">Failed to load normalized profile.</div>
              )}
            </div>
          )}

          </div>
        </div>
      </div>

      {/* Footer controls (fixed at bottom of screen) */}
      <div className="w-full bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 py-4 px-4 z-20 flex-shrink-0">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            {step === 1 ? (
              <button
                type="button"
                onClick={handleBackToCredentials}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-extrabold text-primary-600 dark:text-accent-400 hover:text-primary-700 dark:hover:text-accent-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Credentials
              </button>
            ) : step > 1 && step < 4 ? (
              <button
                type="button"
                onClick={prevStep}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-extrabold text-primary-600 dark:text-accent-400 hover:text-primary-700 dark:hover:text-accent-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
            ) : step === 4 && !loading ? (
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-extrabold text-primary-600 dark:text-accent-400 hover:text-primary-700 dark:hover:text-accent-300 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Edit Details
              </button>
            ) : null}
          </div>

          <div>
            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary-700 to-accent-500 text-white font-extrabold rounded-xl text-sm shadow-md shadow-accent-500/20 hover:from-primary-600 hover:to-accent-600 transition-all duration-200 cursor-pointer"
              >
                <span>{step === 3 ? 'Process with AI' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              !loading && normalizedPreview && (
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-extrabold shadow-md shadow-emerald-500/15 transition-all duration-200 cursor-pointer"
                >
                  Confirm & Save Profile
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetup;
