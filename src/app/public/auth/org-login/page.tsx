"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function OrgLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  // Prevent hydration mismatch
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // ----------------------------------------------------
      // 1️⃣ Supabase Auth Login
      // ----------------------------------------------------
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Invalid login credentials");
      }

      const auth_uid = authData.user.id;

      // ----------------------------------------------------
      // 2️⃣ Fetch user info
      // ----------------------------------------------------
      const { data: userInfo, error: userInfoError } = await supabase
        .from("userinfo")
        .select("*")
        .eq("auth_uid", auth_uid)
        .single();

      if (userInfoError || !userInfo) {
        await supabase.auth.signOut();
        throw new Error("User information not found");
      }

      // ----------------------------------------------------
      // 3️⃣ Role enforcement (Org User Only)
      // ----------------------------------------------------
      if (userInfo.role_id !== 2) {
        await supabase.auth.signOut();
        throw new Error("Access denied: not an organization user");
      }

      // ----------------------------------------------------
      // 4️⃣ Organization email verification
      // ----------------------------------------------------
      const { data: orgData, error: orgError } = await supabase
        .from("organization")
        .select("email_verified")
        .eq("org_id", userInfo.org_id)
        .single();

      if (orgError || !orgData) {
        await supabase.auth.signOut();
        throw new Error("Organization information not found");
      }

      if (!orgData.email_verified) {
        await supabase.auth.signOut();
        throw new Error("Your email is not verified yet.");
      }

      // ----------------------------------------------------
      // 5️⃣ SUCCESS → Dashboard
      // ----------------------------------------------------
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err.message || "Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* ================= LEFT BRAND PANEL ================= */}
      <div className="hidden lg:flex flex-col justify-center px-24 bg-[#714b67] text-white">
        <h1 className="text-4xl font-semibold mb-6">SaaS CRM</h1>

        <p className="text-lg leading-relaxed max-w-md opacity-90">
          Login to manage your organization, branches, users, subscriptions,
          and analytics — all in one place.
        </p>

        <ul className="mt-10 space-y-3 text-sm opacity-90">
          <li>• Secure organization access</li>
          <li>• Branch & user management</li>
          <li>• Subscription control</li>
          <li>• Enterprise-grade reporting</li>
        </ul>

        <div className="mt-16 text-xs opacity-70">
          © {year ?? "—"} SaaS CRM · All rights reserved
        </div>
      </div>

      {/* ================= RIGHT LOGIN PANEL ================= */}
      <div className="flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="card">
            <h1 className="mb-1">Organization Sign in</h1>
            <p className="mb-8">
              Please enter your organization credentials to continue
            </p>

            {error && (
              <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="org@company.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="w-full">
                {loading ? "Signing in..." : "Log in"}
              </button>

              {/* ================= LINKS SECTION ================= */}
              <div className="flex flex-col items-start text-sm pt-2 space-y-1">
                <a
                  href="#"
                  className="text-[color:var(--primary)] hover:underline cursor-pointer"
                >
                  Forgot password?
                </a>

                <a
                  href="/public/get-started"
                  className="text-[color:var(--primary)] hover:underline cursor-pointer"
                >
                  New in the system? <b>Signup Here..</b>
                </a>

                <span className="text-gray-400">v1.0</span>
              </div>
            </form>
          </div>

          <p className="text-xs text-center text-gray-400 mt-6">
            Protected by enterprise-grade security
          </p>
        </div>
      </div>
    </div>
  );
}
