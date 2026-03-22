import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrCode } from 'lucide-react';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user && user.email === 'ahmedbahloul230@gmail.com') {
      navigate('/admin');
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await login();
      navigate('/admin');
    } catch (error: any) {
      if (error?.code !== 'auth/cancelled-popup-request') {
        console.error("Login failed", error);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
        <QrCode className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Admin Login</h1>
        <button onClick={handleLogin} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
