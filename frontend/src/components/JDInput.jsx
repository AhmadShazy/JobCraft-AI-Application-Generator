import React from 'react';
import { FileText, Building2 } from 'lucide-react';

function JDInput({ jd, setJd, companyName, setCompanyName, disabled }) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-cyan-100/40 backdrop-blur-md px-5 pt-4 pb-3 rounded-2xl border border-accent-200/60 border-t-4 border-t-accent-500 shadow-md">

      {/* Company Name (Optional) */}
      <div className="mb-4 flex-shrink-0">
        <label className="text-sm font-bold text-slate-800 flex items-center space-x-2 mb-2" htmlFor="company-name">
          <Building2 className="w-4.5 h-4.5 text-primary-500" />
          <span>Company Name (Optional)</span>
        </label>
        <input
          id="company-name"
          type="text"
          disabled={disabled}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. Google, Stripe, etc. (Leave blank for auto-detection)"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-accent-500 focus:ring-2 focus:ring-accent-100 transition-all rounded-xl text-slate-800 font-medium placeholder-slate-400 disabled:opacity-50"
        />
      </div>

      {/* Label */}
      <label className="text-sm font-bold text-slate-800 flex items-center space-x-2 mb-2 flex-shrink-0" htmlFor="jd">
        <FileText className="w-4.5 h-4.5 text-primary-500" />
        <span>Job Description (JD)</span>
      </label>

      {/* Textarea fills all remaining space in the column */}
      <textarea
        id="jd"
        disabled={disabled}
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        placeholder="Paste the full job description details here (skills, responsibilities, requirements)..."
        className="flex-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-accent-500 focus:ring-2 focus:ring-accent-100 transition-all rounded-xl text-slate-800 font-medium placeholder-slate-400 resize-none disabled:opacity-50 overflow-y-auto"
      />

    </div>
  );
}

export default JDInput;
