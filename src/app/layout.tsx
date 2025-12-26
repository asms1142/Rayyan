// src/app/layout.tsx
import "./globals.css";
import RouteProgressWrapper from "@/components/layout/RouteProgressWrapper";

export const metadata = {
  title: "SaaS CRM",
  description: "Enterprise CRM System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body
        className="h-full antialiased bg-[var(--bg-app)] text-[var(--text-primary)]"
        suppressHydrationWarning
      >
        {/* Wrap children with client-side RouteProgress */}
        <RouteProgressWrapper>{children}</RouteProgressWrapper>
      </body>
    </html>
  );
}
