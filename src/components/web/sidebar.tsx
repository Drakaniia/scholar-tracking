'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  GraduationCap,
  FileCheck,
  User,
  LogOut,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/providers/session-provider';

const navItems = [
  {
    title: 'Dashboard',
    href: '/web/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Scholarships',
    href: '/web/scholarships',
    icon: BookOpen,
  },
  {
    title: 'Applications',
    href: '/web/applications',
    icon: FileCheck,
  },
  {
    title: 'Profile',
    href: '/web/profile',
    icon: User,
  },
];

export function WebSidebar() {
  const pathname = usePathname();
  const { logout } = useSession();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/web/login';
  };

  return (
    <div className="flex h-full flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="ml-2 text-lg font-semibold">Student Portal</span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}