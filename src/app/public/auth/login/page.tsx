"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppLayout from "@/components/layout/AppLayout";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1️⃣ Supabase Auth login
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      if (!loginData.session) throw new Error("No session returned");

      const userId = loginData.user.id;

      // 2️⃣ Fetch userinfo
      const { data: userinfo, error: userinfoError } = await supabase
        .from("userinfo")
        .select("user_id, role_id, prefered_land_page")
        .eq("auth_uid", userId)
        .single();

      if (userinfoError) console.warn("Error fetching userinfo:", userinfoError);

      let landingPage: string | null = null;

      // 3️⃣ Use prefered_land_page if available
      if (userinfo?.prefered_land_page) {
        landingPage = userinfo.prefered_land_page;
      } else if (userinfo?.role_id) {
        // 4️⃣ Fallback to role default_land_page
        const { data: role, error: roleError } = await supabase
          .from("userrole")
          .select("default_land_page")
          .eq("role_id", userinfo.role_id)
          .single();
        if (roleError) console.warn("Error fetching role:", roleError);
        landingPage = role?.default_land_page || null;
      }

      // 5️⃣ Validate landingPage against module_menu
      let validLandingPage = false;
      if (landingPage) {
        const { data: menuData, error: menuError } = await supabase
          .from("module_menu")
          .select("page_name")
          .eq("page_name", landingPage)
          .single();
        if (menuError) console.warn("Error validating landing page:", menuError);
        if (menuData?.page_name === landingPage) validLandingPage = true;
      }

      // 6️⃣ Redirect
      if (validLandingPage) {
        router.replace("/protected/" + landingPage);
      } else {
        router.replace("/protected/unauthorized");
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout variant="public">
      <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-2">
        {/* ================= LEFT BRAND PANEL ================= */}
        <div className="hidden lg:flex flex-col justify-center px-24 bg-[#714b67] text-white">
          <h1 className="text-4xl font-semibold mb-6">SaaS CRM</h1>
          <p className="text-lg leading-relaxed max-w-md opacity-90">
            A complete CRM management platform to Customers,
            Projects, Tickets and analytics — all in one place.
          </p>
          <ul className="mt-10 space-y-3 text-sm opacity-90">
            <li>• Secure role-based access</li>
            <li>• Real-time Tickets tracking</li>
            <li>• Subscription & billing management</li>
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
              <h1 className="mb-1 text-2xl font-bold">Sign in</h1>
              <p className="mb-8 text-gray-600">Please enter your credentials to continue</p>

              {error && (
                <div className="mb-4 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block mb-1 text-sm font-medium">Email</label>
                  <input
                    type="email"
                    placeholder="admin@company.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {loading ? "Signing in..." : "Log in"}
                </button>

                {/* ================= LINKS ================= */}
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
    </AppLayout>
  );
}
