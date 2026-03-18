'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usePrefetchData } from '@/hooks/use-queries';

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
  setUserFromStorage: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

const STORAGE_KEY = 'scholartrack_user';

/**
 * Get cached user from sessionStorage
 */
function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * Cache user to sessionStorage
 */
function cacheUser(user: User | null): void {
  if (typeof window === 'undefined') return;
  if (user) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Initialize from sessionStorage on component mount
    if (typeof window !== 'undefined') {
      return getCachedUser();
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { prefetchAll } = usePrefetchData();

  const checkAuth = useCallback(async (): Promise<boolean> => {
    // First check sessionStorage - if we have cached user, assume valid
    // The JWT cookie will be validated on server-side API calls
    const cachedUser = getCachedUser();
    if (cachedUser) {
      setUser(cachedUser);
      return true;
    }

    // Only call API if no cached user exists
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
        cacheUser(userData.user);

        // Prefetch key data after successful authentication
        prefetchAll().catch(err => {
          console.warn('Failed to prefetch data:', err);
        });

        return true;
      } else {
        setUser(null);
        cacheUser(null);
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
      cacheUser(null);
      return false;
    }
  }, [prefetchAll]);

  const logout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();

      // Clear storage regardless of API response
      cacheUser(null);
      setUser(null);
      router.push('/login');
      
      if (!data.success && !response.ok) {
        console.error('Logout failed:', data.error);
      }
    } catch (error) {
      console.error('Logout error:', error);
      cacheUser(null);
      setUser(null);
      router.push('/login');
    }
  };

  const setUserFromStorage = useCallback((userData: User) => {
    setUser(userData);
    cacheUser(userData);
  }, []);

  // Only check auth on mount and when storage check completes, not on every navigation
  useEffect(() => {
    // Skip auth check for login page - it has its own layout
    if (pathname === '/login') {
      return;
    }

    let mounted = true;
    let isRedirecting = false;

    // Only verify with server if we don't have cached user
    const verifyAuth = async () => {
      const cachedUser = getCachedUser();

      // If we have cached user, skip API call and just set loading to false
      if (cachedUser) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      // No cached user - verify with server
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
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, logout, checkAuth, setUserFromStorage }}>
      {children}
    </AuthContext.Provider>
  );
}