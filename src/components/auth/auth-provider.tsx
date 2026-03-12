'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData.user);
        return true;
      } else {
        setUser(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      return false;
    }
  }, []);

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success || response.ok) {
        setUser(null);
        router.push('/login');
      } else {
        console.error('Logout failed:', data.error);
        setUser(null);
        router.push('/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      router.push('/login');
    }
  };

  useEffect(() => {
    // Skip auth check for login page - it has its own layout
    if (pathname === '/login') {
      return;
    }

    let mounted = true;
    let isRedirecting = false;

    // Check authentication status for dashboard pages
    const verifyAuth = async () => {
      try {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated && mounted && !isRedirecting) {
          isRedirecting = true;
          router.push('/login');
        } else if (mounted) {
          setIsLoading(false);
        }
      } catch {
        if (mounted && !isRedirecting) {
          isRedirecting = true;
          router.push('/login');
        }
      }
    };

    verifyAuth();

    return () => {
      mounted = false;
    };
  }, [pathname, router, checkAuth]);

  const isAuthenticated = !!user && !isLoading;

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}