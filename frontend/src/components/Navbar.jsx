import React from 'react';
import { LogOut, Briefcase, History, User } from 'lucide-react';

function Navbar({ onLogout, onToggleHistory, onEditProfile }) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Section */}
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-xl text-accent-400 border border-slate-700 shadow-inner">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-white to-accent-300 bg-clip-text text-transparent">
                JobCraft AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-bold text-slate-400 border-l border-slate-800 pl-2">
                Candidate Workspace
              </span>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onEditProfile}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-accent-500/50 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
            >
              <User className="w-4 h-4 text-accent-400" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={onToggleHistory}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-accent-500/50 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
            >
              <History className="w-4 h-4 text-accent-400" />
              <span>History</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-rose-450 hover:text-rose-400 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/40 hover:border-rose-800/60 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

export default Navbar;
