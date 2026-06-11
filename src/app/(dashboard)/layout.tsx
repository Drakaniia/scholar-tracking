'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { PromotionReminderDialog } from '@/components/dashboard/promotion-reminder-dialog';
import { Sidebar } from '@/components/layout';
import { MainContent, SidebarProvider, useSidebar } from '@/components/layout/layout-wrapper';
import { PageTransition } from '@/components/layout/page-transition';
import { AuthenticatedPreloader } from '@/components/providers/authenticated-preloader';
import { GridBackground } from '@/components/ui/grid-background';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <PromotionReminderDialog />
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
      <AuthenticatedPreloader />
      <SidebarProvider>
        <GridBackground>
          <DashboardContent>{children}</DashboardContent>
        </GridBackground>
      </SidebarProvider>
    </AuthProvider>
  );
}
