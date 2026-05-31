import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { verifySession, loginUser, signupUser, logoutUser, getMyProfile } from '../api/client';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signupCredentials, setSignupCredentials] = useState(null);
  const { addToast } = useToast();

  const isAuthenticatedRef = useRef(isAuthenticated);
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const session = await verifySession();
      setUser(session);
      setIsAuthenticated(true);
      
      const profileInfo = await getMyProfile();
      setProfileComplete(profileInfo.profile_complete);
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      setProfileComplete(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    // Register global handler for axios auth failures (silent refresh failures)
    window.handleAuthFailure = () => {
      if (isAuthenticatedRef.current) {
        addToast("Your session has expired. Please log in again.", "error");
      }
      setUser(null);
      setIsAuthenticated(false);
      setProfileComplete(false);
    };
    return () => {
      window.handleAuthFailure = null;
    };
  }, [addToast]);

  const login = async (email, password) => {
    await loginUser(email, password);
    setSignupCredentials(null); // Clear signup pre-fill upon explicit login
    await checkAuth();
  };

  const signup = async (email, password) => {
    await signupUser(email, password);
    setSignupCredentials({ email, password });
    await checkAuth();
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error("Logout request failed:", e);
    }
    setUser(null);
    setIsAuthenticated(false);
    setProfileComplete(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, profileComplete, setProfileComplete, loading, login, signup, logout, signupCredentials, setSignupCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
