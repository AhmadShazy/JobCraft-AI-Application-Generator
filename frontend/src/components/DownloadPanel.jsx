import React from 'react';
import { Download, FileText } from 'lucide-react';

function DownloadPanel({ resumeUrl, coverletterUrl }) {
  const isReady = !!(resumeUrl && coverletterUrl);
  
  const resumeLink = resumeUrl ? `http://localhost:8000${resumeUrl}` : '#';
  const clLink = coverletterUrl ? `http://localhost:8000${coverletterUrl}` : '#';

  return (
    <div className="space-y-3 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <h3 className="text-sm font-bold text-slate-700 flex items-center space-x-2 mb-1">
        <FileText className="w-4 h-4 text-slate-400" />
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
              ? 'bg-primary-50 hover:bg-primary-100 text-primary-700 border-primary-200 hover:border-primary-300 cursor-pointer'
              : 'bg-slate-50 text-slate-400 border-slate-200 opacity-40 cursor-not-allowed'
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
              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300 cursor-pointer'
              : 'bg-slate-50 text-slate-400 border-slate-200 opacity-40 cursor-not-allowed'
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
