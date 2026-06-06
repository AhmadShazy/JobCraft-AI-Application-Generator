import React from 'react';
import { Sparkles } from 'lucide-react';

function GenerateButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 bg-gradient-to-r from-primary-700 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-xl font-extrabold shadow-md shadow-accent-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-250 flex items-center justify-center space-x-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Sparkles className="w-5 h-5 text-white animate-pulse" />
      <span>Generate Resume & Cover Letter</span>
    </button>
  );
}

export default GenerateButton;
