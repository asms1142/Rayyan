"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function OrgLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1️⃣ Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        setError(authError?.message || "Invalid login credentials");
        setLoading(false);
        return;
      }

      const auth_uid = authData.user.id;

      // 2️⃣ Fetch user info to check role
      const { data: userInfo, error: userInfoError } = await supabase
        .from("userinfo")
        .select("*")
        .eq("auth_uid", auth_uid)
        .single();

      if (userInfoError || !userInfo) {
        setError("User info not found");
        setLoading(false);
        return;
      }

      // 3️⃣ Only allow organization users (role_id = 2)
      if (userInfo.role_id !== 2) {
        setError("Access denied: not an organization user");
        setLoading(false);
        return;
      }

      // 4️⃣ Fetch organization to check email verification
      const { data: orgData, error: orgError } = await supabase
        .from("organization")
        .select("email_verified")
        .eq("org_id", userInfo.org_id)
        .single();

      if (orgError || !orgData) {
        setError("Organization info not found");
        setLoading(false);
        return;
      }

      if (!orgData.email_verified) {
        setError("Your email is not verified. Please verify your email to login.");
        setLoading(false);
        return;
      }

      // ✅ Success → redirect to organization dashboard
      setLoading(false);
      router.push("/dashboard"); // replace with your actual org dashboard route
    } catch (err: any) {
      setLoading(false);
      setError("An unexpected error occurred: " + err.message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md p-6">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Organization Login</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
