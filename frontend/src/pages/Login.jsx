import React, { useState } from 'react';
import { Lock, Mail, Sparkles, Eye, EyeOff } from 'lucide-react';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim() === 'admin' && password === 'admin') {
      onLoginSuccess();
    } else {
      setError('Invalid email or password. Use demo credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-800 to-indigo-950 p-4">
      <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 transition-all duration-300">
        
        {/* Header Block */}
        <div className="p-8 pb-6 text-center bg-gradient-to-r from-primary-600 to-indigo-600 text-white relative">
          <div className="absolute top-4 right-4 animate-pulse">
            <Sparkles className="w-5 h-5 text-indigo-200" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">JobCraft AI</h1>
          <p className="mt-2 text-indigo-100 text-sm font-medium">Personal Job Application Generator</p>
        </div>

        {/* Form Block */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm font-medium animate-shake">
              {error}
            </div>
          )}

          {/* Email/Username field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="email">
              Username or Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                id="email"
                type="text"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-800 placeholder-slate-400 font-medium"
                placeholder="e.g. admin"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-slate-800 placeholder-slate-400 font-medium"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-primary-600 to-indigo-600 text-white rounded-xl font-bold shadow-md hover:from-primary-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
          >
            Login to Dashboard
          </button>

          {/* Note section */}
          <div className="text-center pt-2">
            <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 font-medium">
              Demo Credentials: <strong className="text-slate-600">admin</strong> / <strong className="text-slate-600">admin</strong>
            </span>
          </div>
        </form>

      </div>
    </div>
  );
}

export default Login;
