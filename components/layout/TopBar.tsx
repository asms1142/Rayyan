"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

export default function TopBar() {
  const [user, setUser] = useState<User | null>(null);
  const [fullname, setFullname] = useState<string>("");
  const [openDropdown, setOpenDropdown] = useState(false);

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        const { data: userInfo, error } = await supabase
          .from("userinfo")
          .select("fullname")
          .eq("auth_uid", user.id)
          .single();

        if (!error && userInfo) setFullname(userInfo.fullname);
      } else {
        setUser(null);
      }
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  if (!user) return null;

  return (
    <header className="flex justify-between items-center bg-white border-b px-4 py-2 shadow sticky top-0 z-50">
      {/* Left: App name */}
      <div className="font-bold text-lg">SaaS POS</div>

      {/* Right: User profile */}
      <div className="relative">
        <button
          onClick={() => setOpenDropdown(!openDropdown)}
          className="flex items-center gap-2 border rounded px-2 py-1 hover:bg-gray-100"
        >
          <span>{fullname || user.email}</span>
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
            {fullname ? fullname[0].toUpperCase() : "U"}
          </div>
        </button>

        {openDropdown && (
          <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-md z-50">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
