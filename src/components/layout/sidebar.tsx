'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  FileText,
  Menu,
  LogOut,
  User,
  Shield,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/components/providers/session-provider';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Scholarships', href: '/scholarships', icon: GraduationCap },
  { name: 'Applications', href: '/applications', icon: FileText },
];

function NavLinks({
  pathname,
  setOpen,
}: {
  pathname: string;
  setOpen: (open: boolean) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {navigation.map(item => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:bg-accent',
              isActive
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

function UserProfile({
  user,
  loading,
  logout,
}: {
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
  loading: boolean;
  logout: () => void;
}) {
  if (loading || !user) {
    return (
      <div className="border-t bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const initials =
    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className="border-t bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        {/* Avatar with gradient background */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/60 text-primary font-semibold shadow-sm ring-2 ring-primary/10 transition-all hover:ring-primary/30">
          {initials || <User className="h-5 w-5" />}
        </div>

        {/* User info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {user.firstName} {user.lastName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge
              variant={isAdmin ? 'default' : 'secondary'}
              className="h-5 px-1.5 text-[10px] font-medium"
            >
              {isAdmin ? (
                <>
                  <Shield className="h-2.5 w-2.5 mr-1" />
                  {user.role}
                </>
              ) : (
                user.role
              )}
            </Badge>
          </div>
        </div>

        {/* Logout button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="登出"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, loading, logout } = useSession();

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="fixed left-4 top-4 z-50"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-lg font-bold">ScholarTrack</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <NavLinks pathname={pathname} setOpen={setOpen} />
          </div>
          <UserProfile user={user} loading={loading} logout={logout} />
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground">
              Scholarship Tracking System
            </p>
            <p className="text-xs text-muted-foreground">v1.0.0</p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r bg-card md:block">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-lg font-bold">ScholarTrack</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <NavLinks pathname={pathname} setOpen={setOpen} />
          </div>
          <UserProfile user={user} loading={loading} logout={logout} />
          <div className="border-t p-4">
            <p className="text-xs text-muted-foreground">
              Scholarship Tracking System
            </p>
            <p className="text-xs text-muted-foreground">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
