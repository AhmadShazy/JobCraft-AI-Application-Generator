import React from 'react';
import { LogOut, Briefcase, History, User } from 'lucide-react';

function Navbar({ onLogout, onToggleHistory, onEditProfile }) {
  return (
    <header className="bg-navy-950/80 backdrop-blur-md border-b border-primary-800/20 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Section */}
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-primary-500 to-primary-700 rounded-xl text-white shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-primary-300 to-accent-400 bg-clip-text text-transparent">
                JobCraft AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-primary-400/60 border-l border-primary-800/30 pl-2">
                Candidate Workspace
              </span>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onEditProfile}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-primary-300 hover:text-white bg-navy-900/60 hover:bg-primary-950/40 border border-primary-800/30 hover:border-primary-500/50 rounded-xl transition-all duration-200 shadow-sm"
            >
              <User className="w-4 h-4 text-primary-400" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={onToggleHistory}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-primary-300 hover:text-white bg-navy-900/60 hover:bg-primary-950/40 border border-primary-800/30 hover:border-primary-500/50 rounded-xl transition-all duration-200 shadow-sm"
            >
              <History className="w-4 h-4 text-primary-400" />
              <span>History</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-rose-400 hover:text-white bg-navy-900/60 hover:bg-rose-950/40 border border-rose-900/30 hover:border-rose-500/50 rounded-xl transition-all duration-200 shadow-sm"
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
