'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
 LayoutDashboard,
 Users,
 GraduationCap,
 FileSpreadsheet,
 LogOut,
 Menu,
 Settings,
 ChevronDown,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useSidebar } from './layout-wrapper';
import { useAuth } from '@/components/auth/auth-provider';

import logoImage from '@/assets/images/logo.webp';

const navigation = [
 { name: 'Dashboard', href: '/', icon: LayoutDashboard },
 { name: 'Students', href: '/students', icon: Users },
 { name: 'Scholarships', href: '/scholarships', icon: GraduationCap },
 { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
];

interface SidebarProps {
 mobileOpen?: boolean;
 onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
 const pathname = usePathname();
 const router = useRouter();
 const [isLoggingOut, setIsLoggingOut] = useState(false);
 const { setMobileOpen } = useSidebar();
 const { user } = useAuth();
 const isAdmin = user?.role === 'ADMIN';
 
 // Morphing border animation state
 const [borderStyle, setBorderStyle] = useState({ left: 0, width: 0 });
 const navRef = useRef<HTMLDivElement>(null);

 // Calculate border position and width based on active link
 useEffect(() => {
 if (navRef.current) {
 const activeIndex = navigation.findIndex(item => item.href === pathname);
 if (activeIndex !== -1) {
 const links = navRef.current.querySelectorAll('a');
 const activeLink = links[activeIndex] as HTMLElement;
 if (activeLink) {
 const navRect = navRef.current.getBoundingClientRect();
 const linkRect = activeLink.getBoundingClientRect();
 setBorderStyle({
 left: linkRect.left - navRect.left,
 width: linkRect.width,
 });
 }
 }
 }
 }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Logged out successfully');
        // Clear the dashboard visit flag so loader appears on next login
        localStorage.removeItem('hasVisitedDashboard');
        router.push('/login');
        router.refresh();
      } else {
        toast.error(data.error || 'Failed to logout');
        // Clear the dashboard visit flag so loader appears on next login
        localStorage.removeItem('hasVisitedDashboard');
        router.push('/login');
        router.refresh();
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An error occurred during logout');
      // Clear the dashboard visit flag so loader appears on next login
      localStorage.removeItem('hasVisitedDashboard');
      router.push('/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

 return (
 <>
 {/* Mobile Menu Sheet */}
 <Sheet open={mobileOpen} onOpenChange={onMobileClose}>
 <SheetContent side="left" className="w-64 p-4 bg-[#22c55e] border-[#22c55e]">
 <div className="mb-6 flex items-center gap-3 px-3">
 <div className="h-8 w-8 relative shrink-0">
 <Image
 src={logoImage}
 alt="ScholarTrack Logo"
 width={32}
 height={32}
 className="h-full w-full object-contain"
 priority
 />
 </div>
 <span className="text-lg font-bold text-white">ScholarTrack</span>
 </div>
 <nav className="flex flex-col gap-1">
 {navigation.map((item) => {
 const isActive = pathname === item.href;
 return (
 <Link
 key={item.name}
 href={item.href}
 onClick={() => onMobileClose?.()}
 className={cn(
 'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
 isActive
 ? 'bg-[#84cc16] text-white hover:bg-[#84cc16]/90'
 : 'text-white/80 hover:text-white hover:bg-white/10'
 )}
 >
 <item.icon className="h-5 w-5 mr-3" />
 {item.name}
 </Link>
 );
 })}
 </nav>
 <div className="border-t border-white/20 pt-4 space-y-2 mt-4">
 {isAdmin && (
 <Link
 href="/settings"
 onClick={() => onMobileClose?.()}
 className={cn(
 'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
 pathname === '/settings'
 ? 'bg-[#84cc16] text-white hover:bg-[#84cc16]/90'
 : 'text-white/80 hover:text-white hover:bg-white/10'
 )}
 >
 <Settings className="h-5 w-5 mr-3" />
 Settings
 </Link>
 )}
 <Button
 variant="ghost"
 className="w-full justify-start gap-3 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10"
 onClick={handleLogout}
 disabled={isLoggingOut}
 >
 <LogOut className="h-5 w-5" />
 {isLoggingOut ? 'Logging out...' : 'Logout'}
 </Button>
 </div>
 </SheetContent>
 </Sheet>

 {/* Top Header */}
 <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white border-b border-gray-200 shadow-sm">
 <div className="h-full px-4 flex items-center justify-between">
 {/* Left: Logo and Brand */}
 <div className="flex items-center gap-3">
 <div className="h-8 w-8 relative shrink-0">
 <Image
 src={logoImage}
 alt="ScholarTrack Logo"
 width={32}
 height={32}
 className="h-full w-full object-contain"
 priority
 />
 </div>
 <span className="text-lg font-bold text-gray-800 hidden sm:block">ScholarTrack</span>
 </div>

 {/* Center: Desktop Navigation with Morphing Border */}
 <nav ref={navRef} className="hidden md:flex items-center gap-1 relative">
 {/* Morphing border indicator */}
 <div
 className="absolute bottom-0 h-[3px] transition-all duration-300 ease-out"
 style={{
 left: `${borderStyle.left}px`,
 width: `${borderStyle.width}px`,
 background: 'linear-gradient(90deg, hsl(var(--pastel-purple)), hsl(var(--pastel-blue)), hsl(var(--pastel-pink)), hsl(var(--pastel-orange)))',
 }}
 />
 {navigation.map((item) => {
 const isActive = pathname === item.href;
 return (
 <Link
 key={item.name}
 href={item.href}
className={cn(
    'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out relative',
    isActive
    ? 'bg-primary text-primary-foreground'
    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  )}
 >
 <item.icon className="h-4 w-4" />
 {item.name}
 </Link>
 );
 })}
 </nav>

{/* Right: User Menu */}
 <div className="flex items-center gap-2">
 {/* Desktop User Dropdown */}
 <DropdownMenu>
 <DropdownMenuTrigger asChild className="hidden md:flex">
 <Button variant="ghost" className="text-gray-700 hover:bg-gray-100 gap-2">
 <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
 {user?.username?.charAt(0).toUpperCase() || 'U'}
 </div>
 <span className="text-sm">{user?.username || 'User'}</span>
 <ChevronDown className="h-4 w-4" />
 </Button>
 </DropdownMenuTrigger>
 <DropdownMenuContent align="end" className="w-48">
 <div className="px-2 py-1.5 text-sm">
 <p className="font-medium">{user?.username}</p>
 <p className="text-xs text-muted-foreground">{user?.role}</p>
 </div>
 <DropdownMenuSeparator />
 {isAdmin && (
 <DropdownMenuItem asChild>
 <Link href="/settings" className="cursor-pointer">
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
 className="md:hidden text-gray-700 hover:bg-gray-100"
 >
 <Menu className="h-5 w-5" />
 </Button>
 </div>
 </div>
 </header>
 </>
 );
}
