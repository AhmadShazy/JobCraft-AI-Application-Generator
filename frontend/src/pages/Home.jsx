import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import JDInput from '../components/JDInput';
import GenerateButton from '../components/GenerateButton';
import Loader from '../components/Loader';
import QAPanel from '../components/QAPanel';
import HistoryDrawer from '../components/HistoryDrawer';
import { generateDocs, answerQuestion, getHistory, sendVerificationEmail, API_BASE_URL } from '../api/client';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import ProfileEdit from './ProfileEdit';
import { AlertTriangle, Loader2 } from 'lucide-react';



const triggerDownload = (url) => {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = `${API_BASE_URL}${url}`;
  document.body.appendChild(iframe);
  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 2000);
};

function Home({ onLogout }) {
  const [jd, setJd] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { addToast } = useToast();
  const { emailVerified } = useAuth();
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSendVerification = async () => {
    setSendingVerification(true);
    try {
      await sendVerificationEmail();
      setVerificationSent(true);
      addToast('Verification email sent. Check your inbox.', 'success');
    } catch (err) {
      console.error(err);
      addToast(
        err.response?.data?.detail || 
        'Failed to send verification email. Please try again later.',
        'error'
      );
    } finally {
      setSendingVerification(false);
    }
  };

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Q&A state
  const [qaList, setQaList] = useState([]);
  const [isAnswering, setIsAnswering] = useState(false);

  // Profile Edit toggle state
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getHistory();
      setHistoryList(data);
    } catch (err) {
      console.error('Failed to retrieve history logs:', err);
    }
  };

  const handleGenerate = async () => {
    if (!jd.trim()) {
      addToast('Please fill in all required fields before continuing.', 'error');
      return;
    }

    setIsGenerating(true);

    try {
      const data = await generateDocs(jd.trim());
      // Auto-refresh history lists so the generated item is added instantly
      fetchHistory();

      // Automatically trigger downloads
      if (data.resume_url) {
        triggerDownload(data.resume_url);
      }
      if (data.coverletter_url) {
        setTimeout(() => {
          triggerDownload(data.coverletter_url);
        }, 500);
      }
    } catch (err) {
      console.error(err);
      addToast(
        err.response?.data?.detail || 
        'Failed to generate application files. Please check if your FastAPI backend server is running and configured with a valid GEMINI_API_KEY.',
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendQuestion = async (questionText) => {
    if (!jd.trim()) {
      addToast('Please fill in all required fields before continuing.', 'error');
      return;
    }

    setIsAnswering(true);

    try {
      const data = await answerQuestion(jd.trim(), questionText);
      setQaList((prev) => [...prev, { question: questionText, answer: data.answer }]);
    } catch (err) {
      console.error(err);
      addToast(
        err.response?.data?.detail || 
        'Failed to get Q&A response from AI. Verify backend status.',
        'error'
      );
    } finally {
      setIsAnswering(false);
    }
  };

  if (isEditingProfile) {
    return <ProfileEdit onBackToDashboard={() => setIsEditingProfile(false)} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Navbar 
        onLogout={onLogout} 
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)} 
        onEditProfile={() => setIsEditingProfile(true)} 
      />

      {/* Verification Banner */}
      {!emailVerified && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between gap-4 text-amber-850 text-sm animate-fade-in flex-shrink-0 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Please verify your email address to secure your account.</span>
          </div>
          <div className="flex items-center gap-3">
            {verificationSent ? (
              <span className="text-xs font-semibold text-amber-850 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-200 animate-fade-in">
                Verification email sent. Check your inbox.
              </span>
            ) : (
              <button
                onClick={handleSendVerification}
                disabled={sendingVerification}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold border border-amber-300 transition-all text-xs disabled:opacity-50 cursor-pointer"
              >
                {sendingVerification && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Send Verification Email</span>
              </button>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 overflow-hidden max-w-7xl w-full mx-auto p-4 flex flex-col gap-4">
        
        {/* Dashboard Workspace — fills all remaining height */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto lg:overflow-hidden pr-1">
          
          {/* Left Column (Inputs & Generation) */}
          <div className="flex flex-col h-[500px] lg:h-full gap-4 overflow-hidden">
            <JDInput
              jd={jd}
              setJd={setJd}
              disabled={isGenerating}
            />

            <div className="bg-slate-900 px-5 py-4 rounded-2xl border border-slate-800 shadow-md flex-shrink-0">
              <GenerateButton
                onClick={handleGenerate}
                disabled={isGenerating || !jd.trim()}
              />
              {isGenerating && <Loader />}
            </div>
          </div>

          {/* Right Column (Q&A Panel) */}
          <div className="flex flex-col h-[500px] lg:h-full overflow-hidden">
            <QAPanel
              qaList={qaList}
              onSendQuestion={handleSendQuestion}
              isLoading={isAnswering}
            />
          </div>

        </div>

      </main>

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        historyList={historyList}
        onRefresh={fetchHistory}
      />
    </div>
  );
}

export default Home;
