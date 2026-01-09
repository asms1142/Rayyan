import { Suspense } from "react";
import SetPasswordForm from "@/components/auth/SetPasswordForm";

export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <SetPasswordForm />
    </Suspense>
  );
}
