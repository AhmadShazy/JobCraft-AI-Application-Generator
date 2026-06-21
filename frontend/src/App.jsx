import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import VerifyEmailPage from './pages/VerifyEmailPage';
import EmailVerificationGate from './pages/EmailVerificationGate';
import { Loader2 } from 'lucide-react';

function AppContent({ darkMode, toggleDarkMode }) {
  // Render verify-email page publicly if URL path matches
  if (window.location.pathname === '/verify-email') {
    return <VerifyEmailPage />;
  }

  const { isAuthenticated, emailVerified, profileComplete, loading, logout } = useAuth();

  // 1. Initial silent refresh verification loader
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 animate-fade-in">
        <Loader2 className="w-10 h-10 text-primary-600 dark:text-accent-400 animate-spin mb-3" />
        <span className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400">Loading JobCraft AI Workspace...</span>
      </div>
    );
  }

  // 2. Gate unauthenticated users
  if (!isAuthenticated) {
    return <Login darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  // 3. Authenticated but not email verified
  if (!emailVerified) {
    return <EmailVerificationGate darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  // 4. Gate users with incomplete profiles
  if (!profileComplete) {
    return <ProfileSetup darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
  }

  // 5. Render main application dashboard
  return <Home onLogout={logout} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <ToastProvider>
      <AuthProvider>
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-200">
          <AppContent darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
