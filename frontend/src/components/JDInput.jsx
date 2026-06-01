import React from 'react';
import { FileText } from 'lucide-react';

function JDInput({ jd, setJd, disabled }) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-navy-900/40 backdrop-blur-xl px-5 pt-4 pb-3 rounded-2xl border border-primary-800/30 shadow-2xl">

      {/* Label */}
      <label className="text-sm font-bold text-primary-300 flex items-center space-x-2 mb-2 flex-shrink-0" htmlFor="jd">
        <FileText className="w-4 h-4 text-primary-400/80" />
        <span>Job Description (JD)</span>
      </label>

      {/* Textarea fills all remaining space in the column */}
      <textarea
        id="jd"
        disabled={disabled}
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the full job description details here (skills, responsibilities, requirements)..."
        className="flex-1 w-full px-4 py-3 bg-navy-950/60 border border-primary-700/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/40 transition-all text-slate-100 font-medium placeholder-primary-700/50 resize-none disabled:opacity-50 overflow-y-auto"
      />

    </div>
  );
}

export default JDInput;
