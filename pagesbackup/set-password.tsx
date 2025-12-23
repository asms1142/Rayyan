import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function SetPasswordPage() {
  const router = useRouter();
  const { org_id } = router.query;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState("");

  const handleSetPassword = async () => {
    if (password !== confirm) {
      setStatus("Passwords do not match");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setStatus(error.message);
      return;
    }

    // mark org verified
    await fetch("/api/verify-org-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id }),
    });

    setStatus("Password set successfully. Redirecting...");
    setTimeout(() => router.push("/auth/org-login"), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-center">Set Your Password</h2>

        <input
          type="password"
          placeholder="New Password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          className="w-full border p-2 rounded"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <button
          onClick={handleSetPassword}
          className="w-full bg-blue-600 text-white p-2 rounded"
        >
          Set Password
        </button>

        {status && <p className="text-center text-sm">{status}</p>}
      </div>
    </div>
  );
}
