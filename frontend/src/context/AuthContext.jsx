import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'server-monitor-token';

const AuthContext = createContext(null);

function getStoredToken() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(null);
  const [checking, setChecking] = useState(true);

  const setToken = useCallback((value) => {
    setTokenState(value);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback(async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    return data;
  }, [setToken]);

  const logout = useCallback(() => {
    const t = getStoredToken();
    if (t) {
      fetch('/api/auth/logout', { headers: { Authorization: `Bearer ${t}` } }).catch(() => {});
    }
    setToken(null);
  }, [setToken]);

  useEffect(() => {
    const stored = getStoredToken();
    if (!stored) {
      setChecking(false);
      return;
    }
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${stored}` } })
      .then((r) => {
        if (r.ok) setTokenState(stored);
        else setToken(null);
      })
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, [setToken]);

  const value = {
    token,
    isAuthenticated: !!token,
    checking,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
