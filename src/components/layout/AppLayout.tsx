"use client";

import { ReactNode, useEffect, useState, memo } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type AppLayoutProps = {
  children: ReactNode;
  variant?: "public" | "protected";
};

function AppLayout({ children, variant = "protected" }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  /* ---------- PUBLIC LAYOUT ---------- */
  if (variant === "public") {
    return (
      <div className="min-h-screen w-full bg-[var(--bg-app)] flex flex-col">
        <main className="flex-1 w-full">{children}</main>
      </div>
    );
  }

  /* ---------- PROTECTED LAYOUT ---------- */
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex flex-col flex-1">
        <TopBar />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default memo(AppLayout);
