import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import JDInput from '../components/JDInput';
import GenerateButton from '../components/GenerateButton';
import Loader from '../components/Loader';
import QAPanel from '../components/QAPanel';
import HistoryDrawer from '../components/HistoryDrawer';
import { generateDocs, answerQuestion, getHistory, downloadDocument } from '../api/client';
import { useToast } from '../context/ToastContext';
import ProfileEdit from './ProfileEdit';
import Settings from './Settings';
import { FileText, Download, Loader2, CheckCircle2 } from 'lucide-react';

function Home({ onLogout, darkMode, toggleDarkMode }) {
  const [jd, setJd] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { addToast } = useToast();

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Q&A state
  const [qaList, setQaList] = useState([]);
  const [isAnswering, setIsAnswering] = useState(false);

  // Generated documents result + per-file download state
  const [result, setResult] = useState(null); // { resume_url, coverletter_url }
  const [downloadingUrl, setDownloadingUrl] = useState(null);

  // Sub-view toggles (this app has no router)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isViewingSettings, setIsViewingSettings] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await getHistory();
      setHistoryList(data);
    } catch (err) {
      console.error('Failed to retrieve history logs:', err);
    }
  };

  // Load history on mount. fetchHistory sets state after an await, not synchronously
  // during render, so this is not the cascading-render case the rule targets.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, []);

  const handleDownload = async (url, label) => {
    if (!url) return;
    setDownloadingUrl(url);
    try {
      await downloadDocument(url);
    } catch (err) {
      console.error(err);
      addToast(
        err.response?.data?.detail ||
        `Could not download the ${label || 'document'}. It may have expired — try generating again.`,
        'error'
      );
    } finally {
      setDownloadingUrl(null);
    }
  };

  const handleGenerate = async () => {
    if (!jd.trim()) {
      addToast('Please fill in all required fields before continuing.', 'error');
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const data = await generateDocs(jd.trim(), companyName.trim());
      setResult(data);
      // Auto-refresh history so the generated item appears instantly
      fetchHistory();
      addToast('Documents generated. Download them below.', 'success');
    } catch (err) {
      console.error(err);
      addToast(
        err.response?.data?.detail ||
        'Failed to generate application files. Please try again in a moment.',
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
    return <ProfileEdit onBackToDashboard={() => setIsEditingProfile(false)} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  if (isViewingSettings) {
    return (
      <Settings
        onBackToDashboard={() => setIsViewingSettings(false)}
        onLoggedOutSelf={onLogout}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Navbar
        onLogout={onLogout}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        onEditProfile={() => setIsEditingProfile(true)}
        onOpenSettings={() => setIsViewingSettings(true)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />

      <main className="flex-1 overflow-hidden max-w-7xl w-full mx-auto p-4 flex flex-col gap-4">

        {/* Dashboard Workspace — fills all remaining height */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto lg:overflow-hidden pr-1">

          {/* Left Column (Inputs & Generation) */}
          <div className="flex flex-col h-[500px] lg:h-full gap-4 overflow-hidden">
            <JDInput
              jd={jd}
              setJd={setJd}
              companyName={companyName}
              setCompanyName={setCompanyName}
              disabled={isGenerating}
            />

            <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex-shrink-0 transition-colors duration-200">
              <GenerateButton
                onClick={handleGenerate}
                disabled={isGenerating || !jd.trim()}
              />
              {isGenerating && <Loader />}

              {/* Results panel — replaces the old invisible iframe download */}
              {result && !isGenerating && (
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-2 mb-3 text-emerald-700 dark:text-emerald-300 text-sm font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Your documents are ready</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownload(result.resume_url, 'resume')}
                      disabled={downloadingUrl === result.resume_url}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingUrl === result.resume_url
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <FileText className="w-4 h-4 text-accent-600 dark:text-accent-400" />}
                      Resume
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDownload(result.coverletter_url, 'cover letter')}
                      disabled={downloadingUrl === result.coverletter_url}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {downloadingUrl === result.coverletter_url
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <FileText className="w-4 h-4 text-accent-600 dark:text-accent-400" />}
                      Cover Letter
                      <Download className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              )}
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
