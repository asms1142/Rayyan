"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "./AppLayout";
import { Loader } from "../ui/Loader";

type LayoutWrapperProps = {
  children: ReactNode;
};

/**
 * LayoutWrapper (AUTH GUARD):
 * 1. Checks Supabase session
 * 2. Redirects unauthenticated users away from /protected/*
 * 3. Allows RBAC to run ONLY after login
 * 4. Prevents Unauthorized page for guests
 */
export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isProtectedRoute = pathname.startsWith("/protected");

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const loggedIn = !!data.session;

      if (!mounted) return;

      setIsLoggedIn(loggedIn);
      setLoading(false);

      // 🔐 HARD REDIRECT: not logged in + protected route
      if (isProtectedRoute && !loggedIn) {
        router.replace("/public/auth/login");
      }
    };

    checkAuth();

    // 🔄 Listen for auth changes (login / logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session?.user;
      setIsLoggedIn(loggedIn);

      // Logout while on protected route → redirect
      if (isProtectedRoute && !loggedIn) {
        router.replace("/public/auth/login");
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [isProtectedRoute, router]);

  // ⏳ Loading screen
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <Loader type="card" count={3} />
      </div>
    );
  }

  // ⛔ Prevent protected page render for guests (extra safety)
  if (isProtectedRoute && !isLoggedIn) {
    return null;
  }

  return (
    <AppLayout variant={isLoggedIn ? "protected" : "public"}>
      {children}
    </AppLayout>
  );
}
