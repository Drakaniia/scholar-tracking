'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
    onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 z-30 h-16 bg-white border-b border-gray-200">
            <div className="flex h-full items-center gap-4 px-6 md:pl-72">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="md:hidden"
                >
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/logo.png"
                            alt="ScholarTrack Logo"
                            className="h-full w-full object-contain"
                        />
                    </div>
                    <span className="text-lg font-bold text-gray-900">ScholarTrack</span>
                </div>
            </div>
        </header>
    );
}
