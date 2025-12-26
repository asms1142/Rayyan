// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SaaS POS",
  description: "Enterprise SaaS POS System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased bg-[var(--bg-app)] text-[var(--text-primary)]"
        suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
