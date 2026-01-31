'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
    mobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar must be used within SidebarProvider');
    }
    return context;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    return (
        <SidebarContext.Provider value={{ mobileOpen, setMobileOpen, collapsed, setCollapsed }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function MainContent({ children }: { children: ReactNode }) {
    return (
        <main className="pt-16">
            <div className="container mx-auto p-4 md:p-8">
                {children}
            </div>
        </main>
    );
}
