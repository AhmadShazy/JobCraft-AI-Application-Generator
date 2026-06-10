import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { verifyEmailToken, sendVerificationEmail } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Loader2, CheckCircle2, XCircle, Mail, ArrowRight } from 'lucide-react';

function VerifyEmailPage() {
  const { isAuthenticated, refreshEmailStatus } = useAuth();
  const { addToast } = useToast();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [resending, setResending] = useState(false);
  const [token, setToken] = useState('');

  const verificationInitiated = useRef(false);

  useEffect(() => {
    if (verificationInitiated.current) return;
    verificationInitiated.current = true;

    const queryParams = new URLSearchParams(window.location.search);
    const tokenVal = queryParams.get('token');
    
    if (!tokenVal) {
      setStatus('error');
      setErrorMessage('No verification token was provided in the link.');
      return;
    }

    setToken(tokenVal);

    const performVerification = async () => {
      try {
        await verifyEmailToken(tokenVal);
        setStatus('success');
        // If authenticated, refresh email status in global AuthContext instantly
        await refreshEmailStatus();
      } catch (err) {
        console.error(err);
        setStatus('error');
        setErrorMessage(
          err.response?.data?.detail || 
          'Failed to verify email. The link may have expired or is invalid.'
        );
      }
    };

    performVerification();
  }, []);

  const handleResend = async () => {
    if (!isAuthenticated) {
      // Redirect to login page
      window.location.href = '/';
      return;
    }

    setResending(true);
    try {
      await sendVerificationEmail();
      addToast('Verification email resent. Check your inbox.', 'success');
    } catch (err) {
      console.error(err);
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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden">
      {/* Sleek Gradient Backdrop */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 animate-fade-in">
        
        {/* Logo/Branding Header */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="h-12 w-12 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
            <Mail className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">JobCraft AI</span>
          <span className="text-xs text-slate-500 font-semibold tracking-widest uppercase mt-1">Verification Workspace</span>
        </div>

        {/* LOADING STATE */}
        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-200">Verifying your email address</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-xs">Connecting to JobCraft security service to validate your token...</p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === 'success' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-4 animate-scale-up">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-emerald-400">Email Verified Successfully!</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
              Your account security setup is complete. You are all set to use JobCraft AI generators.
            </p>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="w-full mt-8 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold tracking-wide transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-[0.98]"
            >
              <span>{isAuthenticated ? 'Go to Dashboard' : 'Sign In to Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ERROR STATE */}
        {status === 'error' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-rose-400">Verification Failed</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-sm leading-relaxed">
              {errorMessage}
            </p>
            
            <div className="w-full mt-8 flex flex-col gap-2">
              {isAuthenticated && (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold tracking-wide transition-all active:scale-[0.98] border border-slate-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {resending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Resend Verification Email</span>
                </button>
              )}
              <button
                onClick={() => { window.location.href = '/'; }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-bold tracking-wide transition-all shadow-lg active:scale-[0.98]"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Login to Resend Verification'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default VerifyEmailPage;
