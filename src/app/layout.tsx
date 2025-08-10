import type { Metadata } from "next";
import { Open_Sans, Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { NavLink } from "@/components/nav-link";
import { NicheProvider } from "@/contexts/NicheContext";
import { ProtectionProvider } from "@/contexts/ProtectionContext";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creator Spark",
  description: "AI-powered video analysis and trending content discovery for creators",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${openSans.variable} ${inter.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <header className="border-b-2 border-default bg-card">
            <div className="mx-auto max-w-6xl px-8 py-4 flex items-center justify-between">
              {/* Logo/Brand */}
              <div className="flex items-center gap-3">
                <span className="text-3xl">✨</span>
                <span className="text-lg font-semibold text-foreground font-inter">Creator Spark</span>
              </div>
              
              {/* Centered Navigation */}
              <nav className="absolute left-1/2 transform -translate-x-1/2">
                <div className="flex items-center gap-6">
                  <NavLink href="/niche-discovery" label="Niche Discovery" />
                  <NavLink href="/script-writer" label="Script Writer" />
                  <NavLink href="/trends" label="Trending" />
                  <NavLink href="/" label="Analyzer" />
                  <NavLink href="/resources" label="Resources" />
                  <NavLink href="/monitoring" label="Monitoring" />
                  <NavLink href="/test-security" label="Test Security" />
                </div>
              </nav>
              
              {/* Theme Toggle */}
              <ThemeToggle />
            </div>
          </header>
          <ProtectionProvider>
            <NicheProvider>
              {children}
            </NicheProvider>
          </ProtectionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
