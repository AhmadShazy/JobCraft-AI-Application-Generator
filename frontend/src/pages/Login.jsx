import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, Sparkles, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

function Login() {
  const { login, signup, signupCredentials } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const passwordsMatch = activeTab === 'login' || (password === confirmPassword && password.length > 0);

  useEffect(() => {
    if (signupCredentials?.email) {
      setEmail(signupCredentials.email);
      setPassword(signupCredentials.password);
      setConfirmPassword(signupCredentials.password);
      setActiveTab('signup');
    }
  }, [signupCredentials]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeTab === 'signup') {
      if (!hasMinLength || !hasNumber) {
        addToast('Password must be at least 8 characters and include one number.', 'error');
        return;
      }
      if (password !== confirmPassword) {
        addToast('Passwords do not match.', 'error');
        return;
      }
    }
    setLoading(true);
    try {
      if (activeTab === 'login') {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail;
      let errMsg = 'Something went wrong. Please try again.';
      if (detail) {
        if (detail.includes('No account found')) {
          errMsg = 'No account found with this email. Please sign up.';
        } else if (detail.includes('Incorrect password') || detail.includes('Incorrect email or password')) {
          errMsg = 'Incorrect email or password. Please try again.';
        } else {
          errMsg = detail;
        }
      }
      addToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-navy-950 p-4 relative overflow-y-auto">

      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] bg-primary-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] bg-accent-500/6 rounded-full blur-3xl pointer-events-none" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md bg-navy-900/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-primary-800/30 relative z-10 my-8">

        {/* Header */}
        <div className="p-8 pb-6 text-center bg-gradient-to-br from-navy-950 to-primary-950/60 text-white relative border-b border-primary-800/20">
          <div className="absolute top-4 right-4">
            <Sparkles className="w-5 h-5 text-accent-500 animate-pulse" />
          </div>
          {/* Logo icon */}
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-lg shadow-primary-500/30">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-300 to-accent-400 bg-clip-text text-transparent">
            JobCraft AI
          </h1>
          <p className="mt-2 text-primary-300/70 text-sm font-medium">Personal Job Application Assistant</p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-primary-800/20 bg-navy-950/40">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === 'login'
                ? 'border-accent-500 text-accent-400 bg-navy-900/40'
                : 'border-transparent text-primary-400/60 hover:text-primary-300'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => setActiveTab('signup')}
            className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === 'signup'
                ? 'border-accent-500 text-accent-400 bg-navy-900/40'
                : 'border-transparent text-primary-400/60 hover:text-primary-300'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-primary-400/80" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-primary-500/60">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-navy-950/60 border border-primary-700/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/40 transition-all text-slate-100 placeholder-primary-700/50 font-medium"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-primary-400/80" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-primary-500/60">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-navy-950/60 border border-primary-700/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/40 transition-all text-slate-100 placeholder-primary-700/50 font-medium"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-500/60 hover:text-primary-400 focus:outline-none">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (signup only) */}
          {activeTab === 'signup' && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-primary-400/80" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-primary-500/60">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-navy-950/60 border border-primary-700/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/60 focus:border-primary-500/40 transition-all text-slate-100 placeholder-primary-700/50 font-medium"
                    placeholder="••••••••"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-primary-500/60 hover:text-primary-400 focus:outline-none">
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password rules */}
              <div className="p-3 bg-navy-950/50 rounded-xl border border-primary-700/20 space-y-2 text-xs font-medium">
                <div className="flex items-center space-x-2">
                  {hasMinLength ? <CheckCircle2 className="w-4 h-4 text-primary-400" /> : <XCircle className="w-4 h-4 text-primary-800/60" />}
                  <span className={hasMinLength ? 'text-slate-300' : 'text-primary-600/60'}>At least 8 characters</span>
                </div>
                <div className="flex items-center space-x-2">
                  {hasNumber ? <CheckCircle2 className="w-4 h-4 text-primary-400" /> : <XCircle className="w-4 h-4 text-primary-800/60" />}
                  <span className={hasNumber ? 'text-slate-300' : 'text-primary-600/60'}>Contains at least one number</span>
                </div>
                <div className="flex items-center space-x-2">
                  {passwordsMatch ? <CheckCircle2 className="w-4 h-4 text-primary-400" /> : <XCircle className="w-4 h-4 text-rose-500" />}
                  <span className={passwordsMatch ? 'text-slate-300' : 'text-rose-400'}>Passwords match</span>
                </div>
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-accent-500 to-accent-700 hover:from-accent-400 hover:to-accent-600 text-navy-950 font-extrabold rounded-xl shadow-lg shadow-accent-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Processing...</span>
            ) : (
              <span>{activeTab === 'login' ? 'Login to Workspace' : 'Get Started'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
