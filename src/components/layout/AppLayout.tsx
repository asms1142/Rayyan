"use client";

import { ReactNode, useState, useEffect, memo } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type AppLayoutProps = {
  children: ReactNode;
  variant?: "public" | "protected"; // layout type
};

/**
 * AppLayout handles both public and protected pages.
 * - Public pages: login/signup etc.
 * - Protected pages: sidebar + topbar
 */
function AppLayout({ children, variant = "protected" }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent SSR mismatch
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // ---------- PUBLIC Layout ----------
if (variant === "public") {
  return (
    <div className="min-h-screen w-full bg-[var(--bg-app)] flex flex-col">
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}

  // ---------- PROTECTED Layout ----------
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex flex-col flex-1">
        <TopBar collapsed={collapsed} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default memo(AppLayout);
