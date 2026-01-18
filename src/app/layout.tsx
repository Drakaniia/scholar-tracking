import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, MainContent } from "@/components/layout/layout-wrapper";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "ScholarTrack - Scholarship Tracking System",
  description: "Manage, monitor, and streamline all scholarship-related activities for students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <SidebarProvider>
          <div className="min-h-screen bg-background">
            <Sidebar />
            <MainContent>
              {children}
            </MainContent>
          </div>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
