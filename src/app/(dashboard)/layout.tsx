'use client';

import { Sidebar } from "@/components/layout";
import { SidebarProvider, MainContent, useSidebar } from "@/components/layout/layout-wrapper";
import { AuthProvider } from "@/components/auth/auth-provider";

function DashboardContent({
 children,
}: {
 children: React.ReactNode;
}) {
 const { mobileOpen, setMobileOpen } = useSidebar();

 return (
 <>
 <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
 <MainContent>
 {children}
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
 <div className="min-h-screen bg-white">
 <DashboardContent>
 {children}
 </DashboardContent>
 </div>
 </SidebarProvider>
 </AuthProvider>
 );
}
