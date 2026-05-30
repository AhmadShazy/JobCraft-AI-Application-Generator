import React from 'react';
import { Building2, FileText } from 'lucide-react';

function JDInput({ jd, setJd, disabled }) {
  return (
    <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">

      {/* Job Description TextArea */}
      <div className="space-y-2">
        <label className="text-sm font-bold text-slate-700 flex items-center space-x-2" htmlFor="jd">
          <FileText className="w-4 h-4 text-slate-400" />
          <span>Job Description (JD)</span>
        </label>
        <textarea
          id="jd"
          rows={10}
          disabled={disabled}
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="Paste the full job description details here (skills, responsibilities, requirements)..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-800 font-medium placeholder-slate-400 resize-y min-h-[200px] disabled:opacity-50"
        />
      </div>

    </div>
  );
}

export default JDInput;
