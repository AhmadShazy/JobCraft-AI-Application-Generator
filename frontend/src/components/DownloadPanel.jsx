import React from 'react';
import { Download, FileText } from 'lucide-react';

function DownloadPanel({ resumeUrl, coverletterUrl }) {
  const isReady = !!(resumeUrl && coverletterUrl);
  
  const resumeLink = resumeUrl ? `http://localhost:8000${resumeUrl}` : '#';
  const clLink = coverletterUrl ? `http://localhost:8000${coverletterUrl}` : '#';

  return (
    <div className="space-y-3 bg-navy-900/40 backdrop-blur-xl p-6 rounded-2xl border border-primary-800/30 shadow-2xl">
      <h3 className="text-sm font-bold text-primary-300 flex items-center space-x-2 mb-1">
        <FileText className="w-4 h-4 text-primary-400/80" />
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
              ? 'bg-navy-900/60 hover:bg-primary-950/40 text-primary-300 hover:text-white border border-primary-800/30 hover:border-primary-500/50 cursor-pointer'
              : 'bg-navy-950/40 text-primary-900/60 border border-primary-900/20 opacity-40 cursor-not-allowed'
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
              ? 'bg-navy-900/60 hover:bg-primary-950/40 text-primary-300 hover:text-white border border-primary-800/30 hover:border-primary-500/50 cursor-pointer'
              : 'bg-navy-950/40 text-primary-900/60 border border-primary-900/20 opacity-40 cursor-not-allowed'
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
