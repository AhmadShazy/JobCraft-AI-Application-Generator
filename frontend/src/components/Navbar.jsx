import { LogOut, Briefcase, History, User, Sun, Moon } from 'lucide-react';

function Navbar({ onLogout, onToggleHistory, onEditProfile, darkMode, toggleDarkMode }) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Section */}
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-tr from-slate-100 to-white dark:from-slate-800 dark:to-slate-700 rounded-xl text-accent-600 dark:text-accent-400 border border-slate-200 dark:border-slate-700 shadow-inner">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-primary-800 to-accent-600 dark:from-white dark:to-accent-300 bg-clip-text text-transparent">
                JobCraft AI
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-bold text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-800 pl-2">
                Candidate Workspace
              </span>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleDarkMode}
              className="flex items-center justify-center p-2.5 text-slate-600 dark:text-slate-300 hover:text-primary-800 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent-500/30 dark:hover:border-accent-500/50 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400 animate-pulse" /> : <Moon className="w-4 h-4 text-accent-500" />}
            </button>

            <button
              onClick={onEditProfile}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-800 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent-500/30 dark:hover:border-accent-500/50 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
            >
              <User className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={onToggleHistory}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-primary-800 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-accent-500/30 dark:hover:border-accent-500/50 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
            >
              <History className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              <span>History</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold text-rose-600 hover:text-white dark:text-rose-200 dark:hover:text-rose-100 bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/60 dark:hover:bg-rose-900 border border-rose-200 dark:border-rose-800/80 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-300" />
              <span>Logout</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}

export default Navbar;
