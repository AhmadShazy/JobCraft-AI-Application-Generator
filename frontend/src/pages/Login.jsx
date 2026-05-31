import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, Mail, Sparkles, Eye, EyeOff, ShieldAlert, CheckCircle2, XCircle } from 'lucide-react';

function Login() {
  const { login, signup, signupCredentials } = useAuth();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password rules validation states
  const hasMinLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const passwordsMatch = activeTab === 'login' || (password === confirmPassword && password.length > 0);

  // Pre-fill signupCredentials if user navigated back from wizard (Phase 3 integration)
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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950 p-4 relative overflow-y-auto">
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-slate-800 transition-all duration-300 relative z-10 my-8">
        
        {/* Header Block */}
        <div className="p-8 pb-6 text-center bg-gradient-to-r from-primary-900/80 to-indigo-950/80 text-white relative border-b border-slate-800">
          <div className="absolute top-4 right-4">
            <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-400 to-indigo-300 bg-clip-text text-transparent">
            JobCraft AI
          </h1>
          <p className="mt-2 text-slate-400 text-sm font-medium">Personal Job Application Assistant v2.0</p>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-900/30">
          <button
            onClick={() => {
              setActiveTab('login');
            }}
            className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === 'login'
                ? 'border-primary-500 text-primary-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-400'
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
            }}
            className={`flex-1 py-3.5 text-sm font-bold border-b-2 transition-all duration-200 ${
              activeTab === 'signup'
                ? 'border-primary-500 text-primary-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-400'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Block */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">

          {/* Email field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-200 placeholder-slate-600 font-medium"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-200 placeholder-slate-600 font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-400 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password field (Signup only) */}
          {activeTab === 'signup' && (
            <>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-200 placeholder-slate-600 font-medium"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-400 focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Rule checklist indicators */}
              <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 space-y-2 text-xs font-medium">
                <div className="flex items-center space-x-2">
                  {hasMinLength ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-600" />
                  )}
                  <span className={hasMinLength ? "text-slate-300" : "text-slate-500"}>At least 8 characters</span>
                </div>
                <div className="flex items-center space-x-2">
                  {hasNumber ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-600" />
                  )}
                  <span className={hasNumber ? "text-slate-300" : "text-slate-500"}>Contains at least one number</span>
                </div>
                <div className="flex items-center space-x-2">
                  {passwordsMatch ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span className={passwordsMatch ? "text-slate-300" : "text-rose-400"}>Passwords match</span>
                </div>
              </div>
            </>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl font-bold shadow-md hover:from-primary-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
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
