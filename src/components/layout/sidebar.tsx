'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    FileSpreadsheet,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSidebar } from './layout-wrapper';
import { toast } from 'sonner';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Students', href: '/students', icon: Users },
    { name: 'Scholarships', href: '/scholarships', icon: GraduationCap },
    { name: 'Reports', href: '/reports', icon: FileSpreadsheet },
];

function NavLinks({ pathname, setOpen }: { pathname: string; setOpen: (open: boolean) => void }) {
    return (
        <nav className="flex flex-col gap-1">
            {navigation.map((item) => {
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

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { collapsed, setCollapsed } = useSidebar();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            });

            if (response.ok) {
                toast.success('Logged out successfully');
                router.push('/login');
                router.refresh();
            } else {
                toast.error('Failed to logout');
            }
        } catch (error) {
            console.error('Logout error:', error);
            toast.error('An error occurred during logout');
        } finally {
            setIsLoggingOut(false);
        }
    };

    return (
        <>
            {/* Mobile Sidebar */}
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50">
                        <Menu className="h-5 w-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-4">
                    <div className="mb-8 flex items-center gap-2">
                        <div className="h-8 w-8 relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/logo.png"
                                alt="ScholarTrack Logo"
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <span className="text-lg font-bold text-black">ScholarTrack</span>
                    </div>
                    <div className="flex-1">
                        <NavLinks pathname={pathname} setOpen={setOpen} />
                    </div>
                    <div className="border-t pt-4 space-y-2">
                        <p className="text-xs text-muted-foreground px-3">
                            Scholarship Tracking System
                        </p>
                        <p className="text-xs text-muted-foreground px-3">v1.0.0</p>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent"
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
                "fixed left-0 top-0 z-40 hidden h-screen border-r bg-card transition-all duration-300 md:block overflow-hidden",
                collapsed ? "w-0 opacity-0 border-0" : "w-64 opacity-100"
            )}>
                <div className="flex h-full flex-col w-64">
                    <div className="flex h-16 items-center gap-2 border-b px-6">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCollapsed(!collapsed)}
                            className="h-8 w-8 shrink-0"
                        >
                            <PanelLeftClose className="h-5 w-5" />
                        </Button>
                        <div className="h-8 w-8 relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/logo.png"
                                alt="ScholarTrack Logo"
                                className="h-full w-full object-contain"
                            />
                        </div>
                        <span className="text-lg font-bold text-black">ScholarTrack</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        <NavLinks pathname={pathname} setOpen={setOpen} />
                    </div>
                    <div className="border-t p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">
                            Scholarship Tracking System
                        </p>
                        <p className="text-xs text-muted-foreground">v1.0.0</p>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent mt-2"
                            onClick={handleLogout}
                            disabled={isLoggingOut}
                        >
                            <LogOut className="h-5 w-5" />
                            {isLoggingOut ? 'Logging out...' : 'Logout'}
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Toggle Button for Desktop - When Collapsed */}
            {collapsed && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCollapsed(false)}
                    className="fixed left-4 top-4 z-50 hidden md:flex"
                >
                    <PanelLeftOpen className="h-5 w-5" />
                </Button>
            )}
        </>
    );
}
