import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { sendVerificationEmail } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Mail, LogOut, Loader2 } from 'lucide-react';

function EmailVerificationGate() {
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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 relative overflow-y-auto animate-fade-in">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] bg-primary-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] bg-accent-500/12 rounded-full blur-3xl pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md bg-cyan-100/40 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-accent-200/60 border-t-4 border-t-accent-500 relative z-10 my-8">
        
        {/* Header */}
        <div className="p-8 pb-6 text-center bg-cyan-100/60 text-slate-800 relative border-b border-accent-200/60">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-md shadow-primary-500/25 animate-bounce">
              <Mail className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
            Verify Your Email
          </h1>
          <p className="mt-2 text-slate-505 text-sm font-semibold uppercase tracking-wider">Security Setup</p>
        </div>

        {/* Content Body */}
        <div className="p-8 space-y-6 text-center">
          <p className="text-slate-600 text-sm font-semibold leading-relaxed">
            We sent a verification link to your email address. Please check your inbox and click the link to continue.
          </p>

          {resendStatus === 'sent' && (
            <div className="text-xs font-semibold text-amber-850 bg-amber-100/70 border border-amber-200 px-3 py-2.5 rounded-xl animate-fade-in">
              Email sent. Check your inbox.
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleResend}
              disabled={resending || resendStatus === 'sent'}
              className="w-full py-3 bg-gradient-to-r from-primary-700 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-extrabold rounded-xl shadow-lg shadow-accent-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2.5 cursor-pointer"
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
