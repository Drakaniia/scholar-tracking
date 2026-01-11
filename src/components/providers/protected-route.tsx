'use client';

import { useSession } from '@/components/providers/session-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  allowedRoles = ['admin', 'staff'],
}: ProtectedRouteProps) {
  const { user, loading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        if (pathname.startsWith('/admin')) {
          router.push('/admin/login');
        } else if (pathname.startsWith('/web')) {
          router.push('/web/login');
        } else {
          router.push('/login');
        }
      } else if (allowedRoles && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized');
      }
    }
  }, [user, loading, router, allowedRoles, pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && allowedRoles.includes(user.role)) {
    return <>{children}</>;
  }

  return null;
}
