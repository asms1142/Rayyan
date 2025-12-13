"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    // 1️⃣ Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      setErrorMessage(authError?.message || "Invalid login credentials");
      setLoading(false);
      return;
    }

    // 2️⃣ Fetch user info to check role
    const { data: userInfo, error: userInfoError } = await supabase
      .from("userinfo")
      .select("*")
      .eq("auth_uid", authData.user.id)
      .single();

    if (userInfoError || !userInfo) {
      setErrorMessage("User info not found");
      setLoading(false);
      return;
    }

    // 3️⃣ Check role: 1 = Superadmin
    if (userInfo.role_id !== 1) {
      setErrorMessage("Access denied: System Users Only!!!");
      setLoading(false);
      return;
    }

    // ✅ Success → redirect to superadmin dashboard
    setLoading(false);
    router.push("/superadmin/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl">System User Login</CardTitle>
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
              <a href="#" className="text-sm text-blue-600 hover:underline">
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
