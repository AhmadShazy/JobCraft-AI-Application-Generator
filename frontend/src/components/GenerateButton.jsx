import React from 'react';
import { Sparkles } from 'lucide-react';

function GenerateButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center space-x-3 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer group"
    >
      <div className="flex-1 px-4 h-12 bg-white border border-slate-200 group-hover:border-accent-500/50 rounded-xl text-sm text-slate-700 font-bold flex items-center transition-all shadow-sm text-left">
        Generate Resume & Cover Letter
      </div>
      <div className="h-12 w-12 flex items-center justify-center bg-gradient-to-r from-primary-700 to-accent-500 group-hover:from-primary-600 group-hover:to-accent-600 text-white rounded-xl shadow-md transition-all duration-250 flex-shrink-0 border border-primary-800/10">
        <Sparkles className="w-4 h-4 text-white animate-pulse" />
      </div>
    </button>
  );
}

export default GenerateButton;
