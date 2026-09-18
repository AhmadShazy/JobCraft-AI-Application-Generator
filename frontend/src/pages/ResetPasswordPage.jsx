import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { resetPassword } from '../api/client';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle, Sparkles, Sun, Moon, ArrowLeft } from 'lucide-react';

function ResetPasswordPage({ darkMode, toggleDarkMode }) {
  const { addToast } = useToast();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      addToast('This reset link is invalid or missing its token.', 'error');
      return;
    }
    if (!hasMinLength || !hasNumber) {
      addToast('Password must be at least 8 characters and include one number.', 'error');
      return;
    }
    if (!passwordsMatch) {
      addToast('Passwords do not match.', 'error');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      addToast('Password updated. You can now log in.', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.detail || 'Could not reset your password. The link may have expired.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-y-auto transition-colors duration-200">
      <div className="absolute top-4 right-4 z-20">
        <button
          type="button"
          onClick={toggleDarkMode}
          className="flex items-center justify-center p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 shadow-sm cursor-pointer"
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-accent-500" />}
        </button>
      </div>

      <div className="w-full max-w-md bg-cyan-100/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-accent-200/60 dark:border-slate-800 border-t-4 border-t-accent-500 relative z-10">
        <div className="p-8 pb-6 text-center border-b border-accent-200/60 dark:border-slate-800">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 dark:from-accent-500 dark:to-accent-600 rounded-2xl shadow-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary-600 to-accent-500 dark:from-white dark:to-accent-300 bg-clip-text text-transparent">
            Reset Password
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm font-semibold">Choose a new password for your account</p>
        </div>

        {done ? (
          <div className="p-8 space-y-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-slate-700 dark:text-slate-300 font-semibold">Your password has been updated.</p>
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-primary-700 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-extrabold rounded-xl shadow-lg transition-all duration-200"
            >
              Go to Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300" htmlFor="new-password">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-accent-500 focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300" htmlFor="confirm-new-password">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="confirm-new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:border-accent-500 focus:ring-2 focus:ring-accent-100 dark:focus:ring-accent-500/40 transition-all text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-bold">
              <div className="flex items-center space-x-2">
                {hasMinLength ? <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-accent-400" /> : <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                <span className={hasMinLength ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}>At least 8 characters</span>
              </div>
              <div className="flex items-center space-x-2">
                {hasNumber ? <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-accent-400" /> : <XCircle className="w-4 h-4 text-slate-300 dark:text-slate-600" />}
                <span className={hasNumber ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}>Contains at least one number</span>
              </div>
              <div className="flex items-center space-x-2">
                {passwordsMatch ? <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-accent-400" /> : <XCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />}
                <span className={passwordsMatch ? 'text-slate-700 dark:text-slate-300' : 'text-rose-500 dark:text-rose-400'}>Passwords match</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary-700 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-extrabold rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>

            <a href="/" className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-accent-600 dark:hover:text-accent-400 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
            </a>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
