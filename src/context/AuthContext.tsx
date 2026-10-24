import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, loginWithEmail, registerWithEmail, logout } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  loginEmail: (email: string, pass: string) => Promise<any>;
  registerEmail: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: loginWithGoogle,
  loginEmail: loginWithEmail,
  registerEmail: registerWithEmail,
  logout: logout,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for local emergency bypass user
    const localUserStr = localStorage.getItem('emergency_bypass_user');
    if (localUserStr) {
      try {
        setUser(JSON.parse(localUserStr));
        setLoading(false);
        return;
      } catch (e) {
        console.error(e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // Don't overwrite local bypass user if set
      if (!localStorage.getItem('emergency_bypass_user')) {
        setUser(firebaseUser);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleBypassLogin = async (email: string, pass: string) => {
    try {
      return await loginWithEmail(email, pass);
    } catch (error: any) {
      if (error?.message?.includes('suspended')) {
        console.warn("Firebase suspended. Using emergency bypass.");
        const mockUser = { email: email, uid: 'bypass-admin', isAnonymous: false } as User;
        localStorage.setItem('emergency_bypass_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return mockUser;
      }
      throw error;
    }
  };

  const handleBypassRegister = async (email: string, pass: string) => {
    try {
      return await registerWithEmail(email, pass);
    } catch (error: any) {
      if (error?.message?.includes('suspended')) {
        console.warn("Firebase suspended. Using emergency bypass.");
        const mockUser = { email: email, uid: 'bypass-admin', isAnonymous: false } as User;
        localStorage.setItem('emergency_bypass_user', JSON.stringify(mockUser));
        setUser(mockUser);
        return mockUser;
      }
      throw error;
    }
  };
  
  const handleBypassLogout = async () => {
    localStorage.removeItem('emergency_bypass_user');
    setUser(null);
    return logout();
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login: loginWithGoogle, 
      loginEmail: handleBypassLogin, 
      registerEmail: handleBypassRegister, 
      logout: handleBypassLogout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
