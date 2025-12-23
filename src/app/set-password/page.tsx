"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const org_id = searchParams.get("org_id");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!org_id) {
      setMessage("Invalid or missing organization.");
      return;
    }

    if (!password || !confirmPassword) {
      setMessage("Please fill all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      console.log("🔐 Setting password...");

      // 1️⃣ Set password
      const { error: passwordError } = await supabase.auth.updateUser({
        password,
      });

      if (passwordError) throw passwordError;

      console.log("✅ Password updated");

      // 2️⃣ Mark email as verified for organization
      console.log("🏢 Updating email_verified for org:", org_id);

      const { error: orgError } = await supabase
        .from("organization") // 🔁 change table name if needed
        .update({ email_verified: true })
        .eq("org_id", org_id);

      if (orgError) throw orgError;

      console.log("✅ Organization email_verified updated");

      setMessage("Password set successfully! Redirecting...");

      // 3️⃣ Redirect to org login
      setTimeout(() => {
        router.push("/public/auth/org-login");
      }, 2000);
    } catch (err: any) {
      console.error("❌ Set password error:", err);
      setMessage(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-4"
      >
        <h2 className="text-2xl font-bold text-center mb-4">
          Set Your Password
        </h2>

        <input
          type="password"
          placeholder="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
          required
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-600"
          required
        />

        {message && (
          <p className="text-sm text-center text-red-600">{message}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-xl font-semibold disabled:opacity-50"
        >
          {loading ? "Setting..." : "Set Password"}
        </button>
      </form>
    </div>
  );
}
