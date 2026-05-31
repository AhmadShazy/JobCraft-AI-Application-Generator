import React from 'react';
import { LogOut, Briefcase, History, User } from 'lucide-react';

function Navbar({ onLogout, onToggleHistory, onEditProfile }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Section */}
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-primary-600 to-indigo-600 rounded-xl text-white shadow-md">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                JobCraft AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold text-slate-400 border-l border-slate-200 pl-2">
                Candidate Workspace
              </span>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onEditProfile}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-primary-700 bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 rounded-xl transition-all duration-200 shadow-sm"
            >
              <User className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={onToggleHistory}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-primary-700 bg-slate-50 hover:bg-primary-50 border border-slate-200 hover:border-primary-200 rounded-xl transition-all duration-200 shadow-sm"
            >
              <History className="w-4 h-4" />
              <span>History</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-slate-600 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-all duration-200 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

export default Navbar;
