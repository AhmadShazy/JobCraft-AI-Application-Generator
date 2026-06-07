import React from 'react';
import { Download, FileText } from 'lucide-react';
import { API_BASE_URL } from '../api/client';

function DownloadPanel({ resumeUrl, coverletterUrl }) {
  const isReady = !!(resumeUrl && coverletterUrl);
  
  const resumeLink = resumeUrl ? `${API_BASE_URL}${resumeUrl}` : '#';
  const clLink = coverletterUrl ? `${API_BASE_URL}${coverletterUrl}` : '#';

  return (
    <div className="space-y-3 bg-cyan-100/40 p-6 rounded-2xl border border-cyan-300 shadow-sm">
      <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2 mb-1">
        <FileText className="w-4.5 h-4.5 text-cyan-500" />
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
              ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-cyan-600 border border-slate-200 hover:border-cyan-350 cursor-pointer'
              : 'bg-slate-100/40 text-slate-400 border border-slate-200/40 opacity-40 cursor-not-allowed'
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
              ? 'bg-white hover:bg-slate-50 text-slate-700 hover:text-cyan-600 border border-slate-200 hover:border-cyan-350 cursor-pointer'
              : 'bg-slate-100/40 text-slate-400 border border-slate-200/40 opacity-40 cursor-not-allowed'
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
