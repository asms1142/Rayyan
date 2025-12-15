"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      console.log("🔵 LOGIN START");

      // 1️⃣ Sign in
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      console.log("🟢 Auth Result:", authData, authError);

      if (authError || !authData.user) {
        setErrorMessage(authError?.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      const user = authData.user;

      // 2️⃣ Fetch role from userinfo table
      const { data: userInfo, error: userInfoError } = await supabase
        .from("userinfo")
        .select("role_id")
        .eq("auth_uid", user.id)
        .maybeSingle();

      if (userInfoError || !userInfo) {
        setErrorMessage("Unable to verify user role.");
        setLoading(false);
        return;
      }

      // 3️⃣ Role check
      if (Number(userInfo.role_id) !== 1) {
        await supabase.auth.signOut();
        setErrorMessage("Access denied: Superadmin only.");
        setLoading(false);
        return;
      }

      console.log("✅ Superadmin verified — redirecting");

      // 4️⃣ Client-side redirect (guaranteed)
      window.location.href = "/superadmin/dashboard";
    } catch (err: any) {
      console.error("❌ LOGIN ERROR:", err);
      setErrorMessage(err?.message || "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Superadmin Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <p className="text-red-600 text-sm text-center">{errorMessage}</p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="text-right">
              <a
                href="/auth/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
