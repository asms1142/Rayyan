"use client";

import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.push("/public/auth/login");
    } else {
      alert("Logout failed: " + error.message);
    }
  };

  return (
    <nav className="flex justify-between items-center bg-gray-800 text-white p-4 w-full">
      <div className="text-xl font-bold">SaaS POS - Super Admin</div>
      <button
        onClick={handleLogout}
        className="bg-red-500 px-4 py-2 rounded hover:bg-red-600"
      >
        Logout
      </button>
    </nav>
  );
}
