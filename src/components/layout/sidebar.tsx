'use client';

import { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import {
  ChevronDown,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/auth-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { useSidebar } from './layout-wrapper';

const LOGO_IMAGE_URL = '/images/logo.webp';

const navigationItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Registry', href: '/registry', icon: ClipboardList },
  { name: 'Scholarships', href: '/scholarships', icon: GraduationCap },
  { name: 'Flow', href: '/scholarship-flow', icon: TrendingUp },
  { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
  { name: 'Settings', href: '/settings', icon: Settings, adminOnly: true },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { setMobileOpen } = useSidebar();
  const { user } = useAuth();
  const [displayUser, setDisplayUser] = useState<{ username: string; role: string } | null>(null);
  const isAdmin = user?.role === 'ADMIN';

  // Sync user data after hydration to prevent hydration mismatch
  useEffect(() => {
    if (user) {
      setDisplayUser({
        username: user.username || 'User',
        role: user.role,
      });
    } else {
      setDisplayUser(null);
    }
  }, [user]);

  const visibleNavigationItems = navigationItems.filter((item) => !item.adminOnly || isAdmin);
  const displayName = displayUser?.username || 'User';
  const roleLabel = displayUser?.role || 'Guest';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Logged out successfully');
        router.push('/login');
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to logout');
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Sheet */}
      <Sheet
        open={mobileOpen}
        onOpenChange={(open) => {
          if (!open) {
            onMobileClose?.();
          }
        }}
      >
        <SheetContent side="left" className="w-[20rem] gap-0 border-slate-200 bg-white p-0">
          <SheetHeader className="border-b border-slate-200 px-5 py-4 text-left">
            <SheetTitle className="flex items-center gap-3">
              <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
                <Image
                  src={LOGO_IMAGE_URL}
                  alt="ScholarTrack Logo"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                  priority
                  unoptimized
                />
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold leading-tight text-slate-950">
                  ScholarTrack
                </span>
                <span className="block text-xs font-medium text-slate-500">
                  Scholarship Management
                </span>
              </span>
            </SheetTitle>
          </SheetHeader>

          <nav aria-label="Mobile navigation" className="flex-1 space-y-1 px-3 py-4">
            {visibleNavigationItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => onMobileClose?.()}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  )}
                >
                  <item.icon
                    className={cn('h-4 w-4', isActive ? 'text-emerald-700' : 'text-slate-500')}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="mb-3 flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-700 text-sm font-semibold text-white">
                {avatarInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-950">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{roleLabel}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="h-10 w-full justify-start gap-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Top Header */}
      <header className="fixed left-0 right-0 top-0 z-40 h-16 border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_32px_rgba(15,23,42,0.06)] backdrop-blur">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Left: Logo and Brand */}
          <Link
            href="/"
            prefetch={true}
            className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50">
              <Image
                src={LOGO_IMAGE_URL}
                alt="ScholarTrack Logo"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
                unoptimized
              />
            </div>
            <div className="hidden min-w-0 sm:block">
              <span className="block text-base font-semibold leading-tight text-slate-950">
                ScholarTrack
              </span>
              <span className="block text-xs font-medium text-slate-500">
                Scholarship Management
              </span>
            </div>
          </Link>

          {/* Center: Desktop Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1 xl:flex"
          >
            {visibleNavigationItems.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-inset ring-emerald-100'
                      : 'text-slate-600 hover:bg-white hover:text-slate-950'
                  )}
                >
                  <item.icon
                    className={cn('h-4 w-4', isActive ? 'text-emerald-700' : 'text-slate-500')}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Right: User Menu */}
          <div className="flex items-center gap-2">
            {/* Desktop User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="hidden sm:flex">
                <Button
                  variant="ghost"
                  className="h-10 gap-2 rounded-lg border border-transparent px-2 text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-700 text-sm font-semibold text-white">
                    {avatarInitial}
                  </div>
                  <span className="hidden max-w-32 truncate text-sm font-medium lg:inline">
                    {displayName}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{roleLabel}</p>
                </div>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/settings" prefetch={true} className="cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="xl:hidden text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}
