import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import VerifyEmailPage from './pages/VerifyEmailPage';
import EmailVerificationGate from './pages/EmailVerificationGate';
import ResetPasswordPage from './pages/ResetPasswordPage';
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

  // Apply the class for this render. We do NOT persist here — persisting on the
  // first mount would write an explicit 'light'/'dark' derived from the OS and
  // then stop following OS changes even though the user never chose. Persistence
  // happens only in toggleDarkMode, on an explicit user action.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('theme', next ? 'dark' : 'light');
      } catch {
        /* storage unavailable — the class is still applied for this session */
      }
      return next;
    });
  };

  // Read once: this app has no client-side router, so the path cannot change
  // without a full reload. These public routes bypass the auth gate.
  const path = window.location.pathname;
  const isVerifyEmailRoute = path === '/verify-email';
  const isResetPasswordRoute = path === '/reset-password';

  let publicPage = null;
  if (isVerifyEmailRoute) publicPage = <VerifyEmailPage />;
  else if (isResetPasswordRoute) publicPage = <ResetPasswordPage darkMode={darkMode} toggleDarkMode={toggleDarkMode} />;

  return (
    <ToastProvider>
      <AuthProvider>
        <div className="h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col text-slate-800 dark:text-slate-100 transition-colors duration-200">
          {/*
            Verify-email and reset-password links are opened by people who may not be
            logged in, so they bypass the auth gate. The check lives here rather than
            inside AppContent because an early return there would make its useAuth()
            call conditional, changing the hook order between renders.
          */}
          {publicPage
            ? publicPage
            : <AppContent darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
