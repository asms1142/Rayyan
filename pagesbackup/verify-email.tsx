// pages/verify-email.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Verifying your email...");

  useEffect(() => {
    if (!router.isReady) return;

    const verify = async () => {
      try {
        const org_id = router.query.org_id as string | undefined;

        if (!org_id) {
          setStatus("Invalid verification link.");
          return;
        }

        // 1️⃣ Read tokens from hash
        const hash = window.location.hash.replace("#", "");
        const params = new URLSearchParams(hash);

        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");

        if (!access_token || !refresh_token) {
          setStatus("Verification link expired.");
          return;
        }

        // 2️⃣ Set session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          setStatus("Session error: " + sessionError.message);
          return;
        }

        // 3️⃣ Get logged-in user
        const { data: userData } = await supabase.auth.getUser();
        const auth_uid = userData.user?.id;

        if (!auth_uid) {
          setStatus("Unable to detect user session.");
          return;
        }

        // 4️⃣ Get password from userinfo (TEMP SOLUTION)
        const { data: userInfo, error: userInfoError } = await supabase
          .from("userinfo")
          .select("password")
          .eq("auth_uid", auth_uid)
          .single();

        if (userInfoError || !userInfo?.password) {
          setStatus("Password setup failed.");
          return;
        }

        // 5️⃣ SET PASSWORD (🔥 THIS WAS MISSING)
        const { error: passwordError } = await supabase.auth.updateUser({
          password: userInfo.password,
        });

        if (passwordError) {
          setStatus("Password setup error: " + passwordError.message);
          return;
        }

        // 6️⃣ Mark organization email as verified
        const res = await fetch("/api/verify-org-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org_id }),
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
          setStatus("Verification failed.");
          return;
        }

        setStatus("Email verified successfully! Redirecting to login...");

        setTimeout(() => {
          router.replace("/auth/org-login");
        }, 3000);
      } catch (err: any) {
        setStatus("Unexpected error: " + err.message);
      }
    };

    verify();
  }, [router.isReady, router.query.org_id]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <h2 className="text-2xl text-center">{status}</h2>
    </div>
  );
}
