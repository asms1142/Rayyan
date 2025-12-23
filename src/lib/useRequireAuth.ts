import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "./supabaseClient";

export default function useRequireAuth() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/auth/login");
      } else {
        setLoading(false);
      }
    };
    checkAuth();
  }, [router]);

  return loading;
}
