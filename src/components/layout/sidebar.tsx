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
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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

function NavLinks({ pathname, setOpen, collapsed }: { pathname: string; setOpen?: (open: boolean) => void; collapsed?: boolean }) {
    return (
        <nav className="flex flex-col gap-1">
            {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setOpen?.(false)}
                        className={cn(
                            'flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative',
                            isActive
                                ? 'bg-[#84cc16] text-white hover:bg-[#84cc16]/90 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#bef264] before:rounded-l-lg'
                                : 'text-white/80 hover:text-white hover:bg-white/10'
                        )}
                        title={collapsed ? item.name : undefined}
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className={cn(
                            "whitespace-nowrap transition-all duration-300 ml-3",
                            collapsed ? "w-0 opacity-0 overflow-hidden ml-0" : "w-auto opacity-100"
                        )}>
                            {item.name}
                        </span>
                    </Link>
                );
            })}
        </nav>
    );
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { collapsed, setCollapsed, setMobileOpen } = useSidebar();
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

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
                // Still redirect even if there's an error
                router.push('/login');
                router.refresh();
            }
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('An error occurred during logout');
            // Still redirect even on error
            router.push('/login');
            router.refresh();
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <>
            {/* Mobile Sidebar */}
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
                    <div className="flex-1">
                        <NavLinks pathname={pathname} setOpen={onMobileClose} />
                    </div>
                    <div className="border-t border-white/20 pt-4 space-y-2 mt-4">
                        <p className="text-xs text-white/60 px-3">
                            Scholarship Tracking System
                        </p>
                        <p className="text-xs text-white/60 px-3">v1.0.0</p>
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

            {/* Desktop Sidebar */}
            <aside className={cn(
                "fixed left-0 top-0 z-40 hidden h-screen border-r border-[#22c55e] bg-[#22c55e] md:block transition-all duration-300 overflow-hidden",
                collapsed ? "w-16" : "w-64"
            )}>
                <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center border-b border-white/20 px-4 gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsed(!collapsed)}
                            className="h-8 w-8 text-white hover:bg-white/10 hover:text-white shrink-0"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className={cn(
                            "flex items-center gap-3 transition-all duration-300 overflow-hidden",
                            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                        )}>
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
                            <span className="text-lg font-bold text-white whitespace-nowrap">ScholarTrack</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <NavLinks pathname={pathname} collapsed={collapsed} />
                    </div>
                    <div className={cn(
                        "border-t border-white/20 p-4 space-y-2"
                    )}>
                        <div className={cn(
                            "transition-all duration-300 overflow-hidden",
                            collapsed ? "h-0 opacity-0" : "h-auto opacity-100"
                        )}>
                            <p className="text-xs text-white/60">
                                Scholarship Tracking System
                            </p>
                            <p className="text-xs text-white/60">v1.0.0</p>
                        </div>
                        {isAdmin && (
                            <Link
                                href="/settings"
                                className={cn(
                                    "text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center rounded-lg",
                                    collapsed ? "w-8 h-8 p-0 justify-center" : "w-full justify-start px-3 py-2.5",
                                    pathname === '/settings' && 'bg-[#84cc16] text-white hover:bg-[#84cc16]/90'
                                )}
                                title={collapsed ? "Settings" : undefined}
                            >
                                <Settings className="h-5 w-5 shrink-0" />
                                <span className={cn(
                                    "whitespace-nowrap transition-all duration-300",
                                    collapsed ? "w-0 opacity-0 overflow-hidden ml-0" : "w-auto opacity-100 ml-3"
                                )}>
                                    Settings
                                </span>
                            </Link>
                        )}
                        <Button
                            variant="ghost"
                            className={cn(
                                "text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors flex items-center",
                                collapsed ? "w-8 h-8 p-0 justify-center" : "w-full justify-start mt-2"
                            )}
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                            title={collapsed ? "Logout" : undefined}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            <span className={cn(
                                "whitespace-nowrap transition-all duration-300",
                                collapsed ? "w-0 opacity-0 overflow-hidden ml-0" : "w-auto opacity-100 ml-3"
                            )}>
                                {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </span>
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Mobile Menu Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(true)}
                className="fixed left-4 top-4 z-50 md:hidden"
            >
                <Menu className="h-5 w-5" />
            </Button>
        </>
    );
}
