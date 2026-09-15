import React from 'react';
import { Download, FileText } from 'lucide-react';
import { API_BASE_URL } from '../api/client';

function DownloadPanel({ resumeUrl, coverletterUrl }) {
  const isReady = !!(resumeUrl && coverletterUrl);
  
  const resumeLink = resumeUrl ? `${API_BASE_URL}${resumeUrl}` : '#';
  const clLink = coverletterUrl ? `${API_BASE_URL}${coverletterUrl}` : '#';

  return (
    <div className="space-y-3 bg-cyan-100/40 dark:bg-slate-900/40 p-6 rounded-2xl border border-cyan-300 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2 mb-1">
        <FileText className="w-[18px] h-[18px] text-cyan-500 dark:text-accent-400" />
        <span>Generated Artifacts</span>
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Download Resume Button */}
        <a
          href={resumeLink}
          download
          onClick={(e) => !isReady && e.preventDefault()}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold transition-all duration-200 border shadow-sm ${
            isReady
              ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-accent-400 border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-accent-500/50 cursor-pointer'
              : 'bg-slate-100/40 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200/40 dark:border-slate-700/40 opacity-40 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Download Resume</span>
        </a>

        {/* Download Cover Letter Button */}
        <a
          href={clLink}
          download
          onClick={(e) => !isReady && e.preventDefault()}
          className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-bold transition-all duration-200 border shadow-sm ${
            isReady
              ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-accent-400 border-slate-200 dark:border-slate-700 hover:border-cyan-300 dark:hover:border-accent-500/50 cursor-pointer'
              : 'bg-slate-100/40 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200/40 dark:border-slate-700/40 opacity-40 cursor-not-allowed'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>Download Cover Letter</span>
        </a>
      </div>
    </div>
  );
}

export default DownloadPanel;
