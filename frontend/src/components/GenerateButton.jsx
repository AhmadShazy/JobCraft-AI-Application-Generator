import React from 'react';
import { Sparkles } from 'lucide-react';

function GenerateButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 flex items-center justify-center space-x-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Sparkles className="w-5 h-5 text-indigo-100" />
      <span>Generate Resume & Cover Letter</span>
    </button>
  );
}

export default GenerateButton;
