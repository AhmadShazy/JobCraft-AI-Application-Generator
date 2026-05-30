import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import JDInput from '../components/JDInput';
import GenerateButton from '../components/GenerateButton';
import Loader from '../components/Loader';
import DownloadPanel from '../components/DownloadPanel';
import QAPanel from '../components/QAPanel';
import HistoryDrawer from '../components/HistoryDrawer';
import { generateDocs, answerQuestion, getHistory } from '../api/client';
import { AlertCircle } from 'lucide-react';

const triggerDownload = (url) => {
  const link = document.createElement('a');
  link.href = `http://localhost:8000${url}`;
  link.setAttribute('download', '');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function Home({ onLogout }) {
  const [companyName, setCompanyName] = useState('');
  const [jd, setJd] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [resumeUrl, setResumeUrl] = useState('');
  const [coverletterUrl, setCoverletterUrl] = useState('');
  const [error, setError] = useState('');

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Q&A state
  const [qaList, setQaList] = useState([]);
  const [isAnswering, setIsAnswering] = useState(false);

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
    if (!companyName.trim()) {
      setError('Please provide a target company name before generating.');
      return;
    }
    if (!jd.trim()) {
      setError('Please paste a job description details before generating.');
      return;
    }

    setError('');
    setIsGenerating(true);
    setResumeUrl('');
    setCoverletterUrl('');

    try {
      const data = await generateDocs(jd.trim(), companyName.trim());
      setResumeUrl(data.resume_url);
      setCoverletterUrl(data.coverletter_url);
      // Auto-refresh history lists so the generated item is added instantly
      fetchHistory();

      // Automatically trigger downloads
      if (data.resume_url) {
        triggerDownload(data.resume_url);
      }
      if (data.coverletter_url) {
        setTimeout(() => {
          triggerDownload(data.coverletter_url);
        }, 150);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Failed to generate application files. Please check if your FastAPI backend server is running and configured with a valid GEMINI_API_KEY.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendQuestion = async (questionText) => {
    if (!jd.trim()) {
      setError('Please paste a job description (JD) in the left panel so the assistant has context to tailor the Q&A answer.');
      return;
    }

    setError('');
    setIsAnswering(true);

    try {
      const data = await answerQuestion(jd.trim(), questionText);
      setQaList((prev) => [...prev, { question: questionText, answer: data.answer }]);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Failed to get Q&A response from AI. Verify backend status.'
      );
    } finally {
      setIsAnswering(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <Navbar onLogout={onLogout} onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Error Alert Display */}
        {error && (
          <div className="flex items-start space-x-3 p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-800 text-sm font-semibold animate-fade-in shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button 
              onClick={() => setError('')} 
              className="text-red-400 hover:text-red-600 text-xs font-bold focus:outline-none"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Dashboard Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (Inputs & Generation) */}
          <div className="lg:col-span-7 space-y-6">
            <JDInput
              companyName={companyName}
              setCompanyName={setCompanyName}
              jd={jd}
              setJd={setJd}
              disabled={isGenerating}
            />

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <GenerateButton
                onClick={handleGenerate}
                disabled={isGenerating || !companyName.trim() || !jd.trim()}
              />
              
              {isGenerating && <Loader />}
            </div>

            <DownloadPanel
              resumeUrl={resumeUrl}
              coverletterUrl={coverletterUrl}
            />
          </div>

          {/* Right Column (Q&A Panel) */}
          <div className="lg:col-span-5">
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
