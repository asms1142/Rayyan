"use client";

import { useState, useEffect, ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { supabase } from "@/lib/supabaseClient";

export default function SidebarLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // 🔐 Check auth status
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsLoggedIn(!!user);
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsLoggedIn(!!session?.user);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ⏳ While checking auth
  if (isLoggedIn === null) return null;

  // ❌ If not logged in → no sidebar/topbar (login pages)
  if (!isLoggedIn) {
    return <>{children}</>;
  }

  // ✅ Logged-in layout
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Right side */}
      <div className="flex flex-col flex-1">
        {/* TopBar */}
        <TopBar collapsed={collapsed} />

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
