import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode, Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { getRedirectResult } from 'firebase/auth';
import { auth } from '../firebase';
import { BrandLogo } from '../components/BrandLogo';

export default function Login() {
  const { login, loginEmail, registerEmail, user } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/admin');
    }
  }, [user, navigate]);

  useEffect(() => {
    getRedirectResult(auth).catch((error: any) => {
      console.error("Redirect login error:", error);
      setError(`Google sign-in failed: ${error.message || error.code || 'Unknown error'}`);
    });
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const formattedEmail = email.includes('@') ? email : `${email.toLowerCase()}@onemenu.app`;

    try {
      await loginEmail(formattedEmail, password);
      navigate('/admin');
    } catch (err: any) {
      // Auto-register any new account if it doesn't exist
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        try {
          await registerEmail(formattedEmail, password);
          navigate('/admin');
          return;
        } catch (registerErr: any) {
          console.error("Auto-register failed", registerErr);
          setError(`Registration notice: ${registerErr.message}`);
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password for this email address.');
      } else {
        setError(err.message || 'Failed to authenticate.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (window !== window.parent) {
      setError("Because this preview is embedded in an iframe, Google blocks the sign-in popup. Please use email sign-in or open in a new tab.");
      return;
    }
    try {
      await login();
      navigate('/admin');
    } catch (error: any) {
      if (error?.code !== 'auth/cancelled-popup-request') {
        console.error("Login failed", error);
        setError(`Google sign-in failed: ${error.message || error.code || 'Unknown error'}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 py-12 relative selection:bg-slate-900 selection:text-white">
      {/* Return to site link */}
      <div className="absolute top-6 left-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Onemenu</span>
        </Link>
      </div>

      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-200 text-center max-w-sm w-full">
        {/* Brand Mark */}
        <div className="flex justify-center mb-4">
          <BrandLogo variant="mark" size="lg" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-1 tracking-tight">
          Operator Console
        </h1>
        <p className="text-xs text-slate-500 mb-6">
          Sign in to manage menus and QR codes
        </p>

        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 text-red-700 text-xs text-left border border-red-200/80 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-3.5 mb-5 text-left">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email or Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="name@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-slate-900 transition-colors placeholder:text-slate-400"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 pt-2.5 mt-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Sign In to Dashboard
          </button>
        </form>

        <div className="relative flex items-center py-2 mb-4">
          <div className="flex-grow border-t border-slate-200"></div>
          <span className="flex-shrink-0 mx-3 text-slate-400 text-[11px] font-medium">Or continue with</span>
          <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          type="button"
          className="w-full bg-white text-slate-700 border border-slate-200 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2.5 shadow-xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google Single Sign-On
        </button>
      </div>
    </div>
  );
}
