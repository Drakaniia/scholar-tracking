import { Sidebar } from "@/components/layout";
import { SidebarProvider, MainContent } from "@/components/layout/layout-wrapper";
import { AuthProvider } from "@/components/auth/auth-provider";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <div className="min-h-screen bg-gradient-to-br from-[#93A87E] via-[#A8B89A] to-[#93A87E]">
          <Sidebar />
          <MainContent>
            {children}
          </MainContent>
        </div>
      </SidebarProvider>
    </AuthProvider>
  );
}