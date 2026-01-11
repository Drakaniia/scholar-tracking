import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { AdminSidebar } from "@/components/admin";
import { WebSidebar } from "@/components/web";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

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
        <SessionProvider>
          <div className="min-h-screen bg-background">
            <main className="md:ml-64">
              <div className="container mx-auto p-4 pt-16 md:p-8 md:pt-8">
                {children}
              </div>
            </main>
          </div>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
