import React from 'react';
import { Sparkles } from 'lucide-react';

function GenerateButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-400 hover:to-accent-600 text-navy-950 rounded-xl font-extrabold shadow-lg shadow-accent-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200 flex items-center justify-center space-x-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Sparkles className="w-5 h-5 text-navy-950 animate-pulse" />
      <span>Generate Resume & Cover Letter</span>
    </button>
  );
}

export default GenerateButton;
