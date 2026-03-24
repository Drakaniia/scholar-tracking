'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { Sidebar } from '@/components/layout';
import { MainContent, SidebarProvider, useSidebar } from '@/components/layout/layout-wrapper';
import { PageTransition } from '@/components/layout/page-transition';
import { GridBackground } from '@/components/ui/grid-background';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <MainContent>
        <PageTransition>{children}</PageTransition>
      </MainContent>
    </>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <GridBackground>
          <DashboardContent>{children}</DashboardContent>
        </GridBackground>
      </SidebarProvider>
    </AuthProvider>
  );
}
