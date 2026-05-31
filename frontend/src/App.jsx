import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Login from './pages/Login';
import ProfileSetup from './pages/ProfileSetup';
import Home from './pages/Home';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, profileComplete, loading, logout } = useAuth();

  // 1. Initial silent refresh verification loader
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-3" />
        <span className="text-sm font-semibold tracking-wider text-slate-400">Loading JobCraft AI Workspace...</span>
      </div>
    );
  }

  // 2. Gate unauthenticated users
  if (!isAuthenticated) {
    return <Login />;
  }

  // 3. Gate users with incomplete profiles
  if (!profileComplete) {
    return <ProfileSetup />;
  }

  // 4. Render main application dashboard
  return <Home onLogout={logout} />;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <div className="h-screen overflow-hidden bg-slate-950 flex flex-col">
          <AppContent />
        </div>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
