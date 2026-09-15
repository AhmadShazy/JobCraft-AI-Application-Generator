import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import VerifyEmailPage from './pages/VerifyEmailPage';
import EmailVerificationGate from './pages/EmailVerificationGate';
import { Loader2 } from 'lucide-react';

function AppContent({ darkMode, toggleDarkMode }) {
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

// Mirrors the pre-paint script in index.html — keep the two in sync.
// An explicit choice in localStorage wins; otherwise follow the OS setting.
function resolveTheme() {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function App() {
  const [darkMode, setDarkMode] = useState(resolveTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    } catch {
      /* storage unavailable — the class is still applied for this session */
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Read once: this app has no client-side router, so the path cannot change
  // without a full reload.
  const isVerifyEmailRoute = window.location.pathname === '/verify-email';

  return (
    <ToastProvider>
      <AuthProvider>
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-200">
          {/*
            The verify-email link is opened by people who may not be logged in, so it
            bypasses the auth gate. The check lives here rather than inside AppContent
            because an early return there would make its useAuth() call conditional,
            changing the hook order between renders.
          */}
          {isVerifyEmailRoute
            ? <VerifyEmailPage />
            : <AppContent darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
