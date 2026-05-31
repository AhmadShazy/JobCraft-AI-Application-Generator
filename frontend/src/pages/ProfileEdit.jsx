import React, { useState, useEffect } from 'react';
import { getMyProfile, normalizeProfile, updateProfile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { User, BookOpen, FileText, CheckSquare, Sparkles, Loader2, Plus, Trash2, AlertTriangle, ArrowLeft, Save, Eye } from 'lucide-react';

// Serialization helpers to convert structured JSON back to free-text
const serializeExperience = (expList) => {
  if (!expList || expList.length === 0) return '';
  return expList.map(exp => {
    const bulletsStr = exp.bullets ? exp.bullets.map(b => `- ${b}`).join('\n') : '';
    return `${exp.title} | ${exp.company} | ${exp.location || ''} | ${exp.duration}\n${bulletsStr}`;
  }).join('\n\n');
};

const serializeSkills = (skillsObj) => {
  if (!skillsObj) return '';
  return Object.values(skillsObj).flat().filter(Boolean).join(', ');
};

const serializeProjects = (projList) => {
  if (!projList || projList.length === 0) return '';
  return projList.map(proj => {
    const bulletsStr = proj.bullets ? proj.bullets.map(b => `- ${b}`).join('\n') : '';
    return `${proj.name} | ${proj.type || ''} | ${proj.duration} | Stack: ${proj.stack || ''}\n${bulletsStr}`;
  }).join('\n\n');
};

const serializeCertifications = (certs) => {
  if (!certs || certs.length === 0) return '';
  return certs.map(c => `${c.name} | ${c.issuer} | ${c.date || ''}`).join('\n');
};

const serializeVolunteering = (volList) => {
  if (!volList || volList.length === 0) return '';
  return volList.map(v => {
    const bulletsStr = v.bullets ? v.bullets.map(b => `- ${b}`).join('\n') : '';
    return `${v.role} | ${v.organization} | ${v.duration}\n${bulletsStr}`;
  }).join('\n\n');
};

function ProfileEdit({ onBackToDashboard }) {
  const { setProfileComplete } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [normLoading, setNormLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // UI Tabs for Edit view
  const [activeTab, setActiveTab] = useState('forms'); // 'forms' | 'freetext'
  
  // Normalized preview
  const [normalizedPreview, setNormalizedPreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // States mirroring wizard structures
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
    tagline: '',
  });
  
  const [languages, setLanguages] = useState([]);
  const [educations, setEducations] = useState([]);
  
  // Unstructured Text States
  const [experienceText, setExperienceText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [projectsText, setProjectsText] = useState('');
  const [certsText, setCertsText] = useState('');
  const [volText, setVolText] = useState('');
  const [additionalText, setAdditionalText] = useState('');

  // Load existing profile from MongoDB
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await getMyProfile();
        const profile = response.profile || {};
        
        // Fill basic info
        setBasicInfo({
          name: profile.name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          location: profile.location || '',
          linkedin: profile.linkedin || '',
          github: profile.github || '',
          portfolio: profile.portfolio || '',
          tagline: profile.tagline || '',
        });

        // Fill languages
        setLanguages(profile.languages || []);
        
        // Fill education
        setEducations(profile.education || []);

        // Serialize structured data back to textareas for Step 3-like edits
        setExperienceText(serializeExperience(profile.experience));
        setSkillsText(serializeSkills(profile.skills));
        setProjectsText(serializeProjects(profile.projects));
        setCertsText(serializeCertifications(profile.certifications));
        setVolText(serializeVolunteering(profile.volunteer));
        setAdditionalText(profile.summary || ''); // Summary is summary/additional text
      } catch (err) {
        console.error(err);
        setError('Failed to load candidate profile details.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  // Handlers for Basic info
  const handleBasicChange = (e) => {
    setBasicInfo({ ...basicInfo, [e.target.name]: e.target.value });
    setError('');
    setSuccessMsg('');
  };

  // Add/Remove Languages
  const addLanguage = () => {
    setLanguages([...languages, { language: '', level: 'Basic' }]);
  };
  const removeLanguage = (index) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };
  const handleLanguageChange = (index, field, value) => {
    const updated = [...languages];
    updated[index][field] = value;
    setLanguages(updated);
  };

  // Add/Remove Education
  const addEducation = () => {
    setEducations([...educations, { institution: '', degree: '', field: '', duration: '', note: '' }]);
  };
  const removeEducation = (index) => {
    setEducations(educations.filter((_, i) => i !== index));
  };
  const handleEducationChange = (index, field, value) => {
    const updated = [...educations];
    updated[index][field] = value;
    setEducations(updated);
  };

  // Direct Save for Basic Info and Educations
  const handleSaveDirectForms = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    // Validations
    if (!basicInfo.name.trim() || !basicInfo.email.trim() || !basicInfo.phone.trim() || !basicInfo.location.trim()) {
      setError('Name, Email, Phone, and Location are required.');
      return;
    }
    const isEduValid = educations.every(edu => edu.institution.trim() && edu.degree.trim() && edu.duration.trim());
    if (!isEduValid || educations.length === 0) {
      setError('Please provide at least one complete Education entry (Institution, Degree, and Duration are required).');
      return;
    }

    setSaveLoading(true);
    try {
      const payload = {
        basic_info: {
          ...basicInfo,
          languages: languages.filter(l => l.language.trim())
        },
        education: educations
      };

      const res = await updateProfile(payload);
      setProfileComplete(res.profile_complete);
      setSuccessMsg('Basic info and Education updated successfully.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to update credentials.');
    } finally {
      setSaveLoading(false);
    }
  };

  // Normalize free-text fields
  const handlePreviewBackground = async () => {
    setError('');
    setSuccessMsg('');
    setNormLoading(true);
    try {
      const payload = {
        basic_info: {
          ...basicInfo,
          languages: languages.filter(l => l.language.trim())
        },
        education: educations,
        experience: experienceText,
        skills: skillsText,
        projects: projectsText,
        certifications: certsText,
        volunteer: volText,
        additional_info: additionalText
      };

      const result = await normalizeProfile(payload);
      setNormalizedPreview(result);
      setShowPreviewModal(true);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'AI Normalization failed. Please verify your text format.');
    } finally {
      setNormLoading(false);
    }
  };

  // Save confirmed normalized background
  const handleSaveNormalizedBackground = async () => {
    if (!normalizedPreview) return;
    setSaveLoading(true);
    try {
      const res = await updateProfile({ profile: normalizedPreview });
      setProfileComplete(res.profile_complete);
      setShowPreviewModal(false);
      setSuccessMsg('Professional background updated and normalized successfully.');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save updated profile.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading Profile Details...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-4 px-6 flex items-center justify-between flex-shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-3">
          <button onClick={onBackToDashboard} className="p-2 text-slate-400 hover:text-slate-200 transition-colors bg-slate-950 border border-slate-850 hover:border-slate-800 rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-extrabold bg-gradient-to-r from-primary-400 to-indigo-300 bg-clip-text text-transparent flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary-400" />
              Manage Profile
            </h1>
            <p className="text-xs font-semibold text-slate-400">Edit candidate records & backgrounds</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
          <button 
            onClick={() => setActiveTab('forms')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'forms' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Basic & Education
          </button>
          <button 
            onClick={() => setActiveTab('freetext')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${activeTab === 'freetext' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Background Details (AI)
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 overflow-y-auto max-w-5xl w-full mx-auto p-6 relative">
        
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border-l-4 border-red-500 rounded-xl text-red-400 text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-950/40 border-l-4 border-emerald-500 rounded-xl text-emerald-400 text-sm font-semibold flex items-center gap-2">
            <CheckSquare className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* FORM VIEW: BASIC INFO & EDUCATION */}
        {activeTab === 'forms' && (
          <form onSubmit={handleSaveDirectForms} className="space-y-6">
            
            {/* Basic Info */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl space-y-6">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-primary-400 border-b border-slate-850 pb-2">Basic Credentials</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Full Name *</label>
                  <input type="text" name="name" value={basicInfo.name} onChange={handleBasicChange} className="w-full py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Email Address *</label>
                  <input type="email" name="email" value={basicInfo.email} onChange={handleBasicChange} className="w-full py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Phone Number *</label>
                  <input type="text" name="phone" value={basicInfo.phone} onChange={handleBasicChange} className="w-full py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Location (City, Country) *</label>
                  <input type="text" name="location" value={basicInfo.location} onChange={handleBasicChange} className="w-full py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">LinkedIn URL</label>
                  <input type="text" name="linkedin" value={basicInfo.linkedin} onChange={handleBasicChange} className="w-full py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">GitHub URL</label>
                  <input type="text" name="github" value={basicInfo.github} onChange={handleBasicChange} className="w-full py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Portfolio Website</label>
                  <input type="text" name="portfolio" value={basicInfo.portfolio} onChange={handleBasicChange} className="w-full py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Headline / Tagline</label>
                  <input type="text" name="tagline" value={basicInfo.tagline} onChange={handleBasicChange} className="w-full py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                </div>
              </div>

              {/* Languages List */}
              <div className="space-y-3 pt-4 border-t border-slate-850">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Languages & Proficiency</label>
                  <button type="button" onClick={addLanguage} className="flex items-center gap-1 text-xs font-bold text-primary-400 hover:text-primary-300">
                    <Plus className="w-3.5 h-3.5" /> Add Language
                  </button>
                </div>
                {languages.map((lang, idx) => (
                  <div key={idx} className="flex items-center gap-3 animate-fade-in">
                    <input type="text" value={lang.language} onChange={(e) => handleLanguageChange(idx, 'language', e.target.value)} className="flex-1 py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" placeholder="e.g. English" />
                    <select value={lang.level} onChange={(e) => handleLanguageChange(idx, 'level', e.target.value)} className="w-40 py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-400 text-sm font-bold focus:outline-none">
                      <option value="Native">Native</option>
                      <option value="Fluent">Fluent</option>
                      <option value="Proficient">Proficient</option>
                      <option value="Basic">Basic</option>
                    </select>
                    {languages.length > 1 && (
                      <button type="button" onClick={() => removeLanguage(idx)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Education Timeline */}
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-primary-400">Education Timeline</h2>
                <button type="button" onClick={addEducation} className="flex items-center gap-1 text-xs font-bold text-primary-400 hover:text-primary-300">
                  <Plus className="w-3.5 h-3.5" /> Add Education
                </button>
              </div>
              <div className="space-y-4">
                {educations.map((edu, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-4 relative animate-fade-in">
                    {educations.length > 1 && (
                      <button type="button" onClick={() => removeEducation(idx)} className="absolute top-2 right-2 p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">Institution Name *</label>
                        <input type="text" value={edu.institution} onChange={(e) => handleEducationChange(idx, 'institution', e.target.value)} className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400">Degree *</label>
                          <input type="text" value={edu.degree} onChange={(e) => handleEducationChange(idx, 'degree', e.target.value)} className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-400">Field of Study</label>
                          <input type="text" value={edu.field} onChange={(e) => handleEducationChange(idx, 'field', e.target.value)} className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">Duration (Start - End) *</label>
                        <input type="text" value={edu.duration} onChange={(e) => handleEducationChange(idx, 'duration', e.target.value)} className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400">Additional Note (Optional)</label>
                        <input type="text" value={edu.note} onChange={(e) => handleEducationChange(idx, 'note', e.target.value)} className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Controls */}
            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={saveLoading}
                className="flex items-center gap-1.5 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
              >
                {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
                <span>Save Basic & Education info</span>
              </button>
            </div>

          </form>
        )}

        {/* FREE TEXT VIEW: AI BACKGROUND NORMALIZATION */}
        {activeTab === 'freetext' && (
          <div className="space-y-6">
            <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-2xl space-y-6">
              <div>
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-primary-400">Professional Background (AI Normalized)</h2>
                <p className="text-xs text-slate-400 mt-1">Review or rewrite your background records. When saving, the AI will parse your edits into the structured candidate format.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Work Experience</label>
                  <textarea value={experienceText} onChange={(e) => setExperienceText(e.target.value)} rows="5" className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Use format: Title | Company | Location | Duration\n- Bullet 1\n- Bullet 2"></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Skills</label>
                  <textarea value={skillsText} onChange={(e) => setSkillsText(e.target.value)} rows="3" className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="List your technical stack separated by commas..."></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Projects</label>
                  <textarea value={projectsText} onChange={(e) => setProjectsText(e.target.value)} rows="5" className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Use format: Project Name | Type | Duration | Stack: Tech\n- Bullet 1\n- Bullet 2"></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Certifications</label>
                  <textarea value={certsText} onChange={(e) => setCertsText(e.target.value)} rows="3" className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="E.g., Stanford Machine Learning | Coursera | Aug 2025"></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Volunteering & Activities</label>
                  <textarea value={volText} onChange={(e) => setVolText(e.target.value)} rows="3" className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Use format: Role | Organization | Duration\n- Bullet 1"></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400">Summary / Personal statement</label>
                  <textarea value={additionalText} onChange={(e) => setAdditionalText(e.target.value)} rows="3" className="w-full py-2 px-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="Paste your short personal overview summary..."></textarea>
                </div>
              </div>
            </div>

            {/* Normalization Controls */}
            <div className="flex justify-end pt-2">
              <button 
                type="button" 
                onClick={handlePreviewBackground}
                disabled={normLoading}
                className="flex items-center gap-1.5 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
              >
                {normLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4.5 h-4.5" />}
                <span>Preview Background with AI</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* PREVIEW & CONFIRM DIALOG MODAL */}
      {showPreviewModal && normalizedPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-fade-in select-none">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-bold text-primary-400 flex items-center gap-1.5">
                  <Sparkles className="w-4.5 h-4.5 text-primary-400 animate-pulse" />
                  Review Structured Changes
                </h3>
                <p className="text-xs text-slate-400">Gemini successfully parsed your text. Verify and click save.</p>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="text-slate-500 hover:text-slate-300 font-bold text-sm">Close</button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              
              {/* Basic Info */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate Details</h4>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div>Name: <span className="font-semibold text-slate-200">{normalizedPreview.name || '[Missing]'}</span></div>
                  <div>Email: <span className="font-semibold text-slate-200">{normalizedPreview.email || '[Missing]'}</span></div>
                  <div>Phone: <span className="font-semibold text-slate-200">{normalizedPreview.phone || '[Missing]'}</span></div>
                  <div>Location: <span className="font-semibold text-slate-200">{normalizedPreview.location || '[Missing]'}</span></div>
                </div>
              </div>

              {/* Skills */}
              <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Skills Categorization</h4>
                {normalizedPreview.skills && Object.keys(normalizedPreview.skills).some(k => normalizedPreview.skills[k]?.length > 0) ? (
                  <div className="space-y-1.5 text-xs">
                    {Object.entries(normalizedPreview.skills).map(([cat, list]) => (
                      list && list.length > 0 && (
                        <div key={cat} className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-slate-500 font-bold capitalize">{cat.replace('_', ' ')}:</span>
                          {list.map((s, idx) => <span key={idx} className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">{s}</span>)}
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="text-amber-500 text-xs font-bold">[No Skills Extracted]</div>
                )}
              </div>

              {/* Experience and Projects */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Experience */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work History</h4>
                  {normalizedPreview.experience && normalizedPreview.experience.length > 0 ? (
                    normalizedPreview.experience.map((exp, i) => (
                      <div key={i} className="text-xs space-y-1 border-b border-slate-900 last:border-b-0 pb-2">
                        <div className="font-bold text-slate-200">{exp.title} at {exp.company}</div>
                        <div className="text-slate-500">{exp.duration}</div>
                        <ul className="list-disc pl-4 text-slate-400 space-y-0.5 mt-1">
                          {exp.bullets?.map((b, idx) => <li key={idx}>{b}</li>)}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <div className="text-amber-500 text-xs font-bold">[No Experience Extracted]</div>
                  )}
                </div>

                {/* Projects */}
                <div className="p-4 bg-slate-950 border border-slate-850 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Projects</h4>
                  {normalizedPreview.projects && normalizedPreview.projects.length > 0 ? (
                    normalizedPreview.projects.map((proj, i) => (
                      <div key={i} className="text-xs space-y-1 border-b border-slate-900 last:border-b-0 pb-2">
                        <div className="font-bold text-slate-200">{proj.name}</div>
                        <div className="text-slate-500">{proj.duration}</div>
                        <div className="text-primary-400/80 font-bold">Stack: {proj.stack}</div>
                        <ul className="list-disc pl-4 text-slate-400 space-y-0.5 mt-1">
                          {proj.bullets?.map((b, idx) => <li key={idx}>{b}</li>)}
                        </ul>
                      </div>
                    ))
                  ) : (
                    <div className="text-amber-500 text-xs font-bold">[No Projects Extracted]</div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Controls */}
            <div className="p-6 border-t border-slate-800 flex justify-end gap-3 flex-shrink-0">
              <button onClick={() => setShowPreviewModal(false)} className="px-4 py-2 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-xl text-sm font-semibold">
                Go Back
              </button>
              <button 
                onClick={handleSaveNormalizedBackground} 
                disabled={saveLoading}
                className="flex items-center gap-1.5 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-md transition-colors"
              >
                {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Confirm & Save Changes</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default ProfileEdit;
