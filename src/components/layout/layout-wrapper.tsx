'use client';

import { ReactNode, createContext, useContext, useState } from 'react';

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

interface MainContentProps {
  children: ReactNode;
  variant?: 'dashboard' | 'settings';
}

export function MainContent({ children, variant = 'dashboard' }: MainContentProps) {
  if (variant === 'settings') {
    return (
      <main className="min-h-screen">
        <div className="container mx-auto px-4 py-5 md:px-8 md:py-8">{children}</div>
      </main>
    );
  }

  return (
    <main className="pt-16">
      <div className="container mx-auto p-4 md:p-8">{children}</div>
    </main>
  );
}
