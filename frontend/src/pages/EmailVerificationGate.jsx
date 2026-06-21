import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendVerificationEmail } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Mail, LogOut, Loader2, Sun, Moon } from 'lucide-react';

function EmailVerificationGate({ darkMode, toggleDarkMode }) {
  const { logout, refreshEmailStatus } = useAuth();
  const { addToast } = useToast();
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState(''); // '', 'sent', 'error'

  // Polling logic: check status every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshEmailStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshEmailStatus]);

  const handleResend = async () => {
    setResending(true);
    setResendStatus('');
    try {
      await sendVerificationEmail();
      setResendStatus('sent');
      addToast('Verification email resent. Check your inbox.', 'success');
    } catch (err) {
      console.error(err);
      setResendStatus('error');
      addToast(
        err.response?.data?.detail || 
        'Failed to resend verification email. Please try again later.',
        'error'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-y-auto animate-fade-in transition-colors duration-200">
      
      {/* Theme Toggle in top-right */}
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="flex items-center justify-center p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-500 animate-pulse" /> : <Moon className="w-4 h-4 text-accent-500" />}
        </button>
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] bg-primary-500/8 dark:bg-primary-500/3 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] bg-accent-500/12 dark:bg-accent-500/5 rounded-full blur-3xl pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md bg-cyan-100/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-accent-200/60 dark:border-slate-800 border-t-4 border-t-accent-500 relative z-10 my-8">
        
        {/* Header */}
        <div className="p-8 pb-6 text-center bg-cyan-100/60 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 relative border-b border-accent-200/60 dark:border-slate-800">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-md shadow-primary-500/25 animate-bounce">
              <Mail className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
            Verify Your Email
          </h1>
          <p className="mt-2 text-slate-505 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">Security Setup</p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6 text-center">
          <p className="text-slate-600 dark:text-slate-300 text-sm font-semibold leading-relaxed">
            We sent a verification link to your email address. Please check your inbox and click the link to continue.
          </p>

          {resendStatus === 'sent' && (
            <div className="text-xs font-semibold text-amber-850 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-3 py-2.5 rounded-xl animate-fade-in">
              Email sent. Check your inbox.
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleResend}
              disabled={resending || resendStatus === 'sent'}
              className="w-full py-3 bg-gradient-to-r from-primary-700 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-extrabold rounded-xl shadow-lg shadow-accent-500/20 dark:shadow-accent-500/5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2.5 cursor-pointer"
            >
              {resending && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Resend Verification Email</span>
            </button>

            <button
              onClick={logout}
              className="w-full py-3 bg-rose-900 hover:bg-rose-800 border border-rose-700 text-rose-200 hover:text-rose-100 font-extrabold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-350" />
              <span>Logout</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default EmailVerificationGate;
