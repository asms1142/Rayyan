"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

/* ================= TYPES ================= */

interface PendingInvite {
  pul_id: number;
  project_id: number;
  invite_token: string;
  status: boolean;
  project_name?: string;
}

interface ProjectMap {
  [key: number]: string;
}

/* ================= COMPONENT ================= */

export default function TopBar() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [fullname, setFullname] = useState("");

  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  const [openInviteDropdown, setOpenInviteDropdown] = useState(false);
  const [openUserDropdown, setOpenUserDropdown] = useState(false);

  /* ================= INIT ================= */

  useEffect(() => {
    initUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      initUser();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  /* ================= USER ================= */

  const initUser = async () => {
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user) {
      setAuthUser(null);
      setUserId(null);
      return;
    }

    setAuthUser(user);

    const { data: userInfo, error } = await supabase
      .from("userinfo")
      .select("user_id, fullname")
      .eq("auth_uid", user.id)
      .single();

    if (error || !userInfo) {
      console.error("❌ userinfo error:", error);
      return;
    }

    setUserId(userInfo.user_id);
    setFullname(userInfo.fullname);

    fetchPendingInvites(userInfo.user_id);
  };

  /* ================= FETCH INVITES ================= */

  const fetchPendingInvites = async (uid: number) => {
    setLoadingInvites(true);

    try {
      // 1️⃣ Fetch pending invites
      const { data: invites, error } = await supabase
        .from("project_users_log") // lowercase table name
        .select("pul_id, project_id, invite_token, status") // lowercase columns
        .eq("user_id", uid)
        .eq("status", false);

      if (error) {
        console.error("❌ Invite fetch error:", error);
        setPendingInvites([]);
        setLoadingInvites(false);
        return;
      }

      if (!invites || invites.length === 0) {
        setPendingInvites([]);
        setLoadingInvites(false);
        return;
      }

      // 2️⃣ Fetch related projects
      const projectIds = [...new Set(invites.map((i) => i.project_id))];

      const { data: projects, error: projectErr } = await supabase
        .from("project")
        .select("project_id, project_name")
        .in("project_id", projectIds);

      if (projectErr) {
        console.error("❌ Project fetch error:", projectErr);
      }

      const projectMap: ProjectMap = {};
      (projects || []).forEach((p) => {
        projectMap[p.project_id] = p.project_name;
      });

      // 3️⃣ Merge
      const enriched = invites.map((i) => ({
        ...i,
        project_name: projectMap[i.project_id] || "Unknown Project",
      }));

      setPendingInvites(enriched);
    } catch (err) {
      console.error("❌ Unexpected invite fetch error:", err);
      setPendingInvites([]);
    } finally {
      setLoadingInvites(false);
    }
  };

  /* ================= ACCEPT INVITE ================= */

  const acceptInvite = async (token: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from("project_users_log")
        .update({
          status: true,
          accepted_at: new Date(),
        })
        .eq("invite_token", token)
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Accept failed:", error);
        alert("Failed to accept invitation");
        return;
      }

      setPendingInvites((prev) =>
        prev.filter((i) => i.invite_token !== token)
      );

      alert("Invitation accepted successfully!");
    } catch (err) {
      console.error("❌ Unexpected accept error:", err);
      alert("Failed to accept invitation");
    }
  };

  /* ================= LOGOUT ================= */

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/public/auth/login";
  };

  if (!authUser) return null;

  /* ================= UI ================= */

  return (
    <header className="flex justify-between items-center bg-white border-b px-4 py-2 shadow sticky top-0 z-50">
      {/* LEFT */}
      <div className="font-bold text-lg">SaaS POS</div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {/* INVITES */}
        <div className="relative">
          <button
            onClick={() => setOpenInviteDropdown(!openInviteDropdown)}
            className="relative border rounded px-3 py-1 hover:bg-gray-100"
          >
            Invitations
            {pendingInvites.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-600 text-white text-xs rounded-full px-1">
                {pendingInvites.length}
              </span>
            )}
          </button>

          {openInviteDropdown && (
            <div className="absolute right-0 mt-2 w-72 bg-white border rounded shadow-lg z-50">
              {loadingInvites && (
                <div className="p-3 text-center text-gray-500">Loading...</div>
              )}

              {!loadingInvites && pendingInvites.length === 0 && (
                <div className="p-3 text-center text-gray-500">
                  No pending invitations
                </div>
              )}

              {pendingInvites.map((invite) => (
                <div
                  key={invite.invite_token}
                  className="flex justify-between items-center px-3 py-2 border-b hover:bg-gray-100"
                >
                  <span className="text-sm">{invite.project_name}</span>
                  <button
                    onClick={() => acceptInvite(invite.invite_token)}
                    className="bg-blue-600 text-white px-2 py-1 rounded text-sm"
                  >
                    Accept
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* USER */}
        <div className="relative">
          <button
            onClick={() => setOpenUserDropdown(!openUserDropdown)}
            className="flex items-center gap-2 border rounded px-2 py-1 hover:bg-gray-100"
          >
            <span>{fullname || authUser.email}</span>
            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-sm font-bold">
              {fullname ? fullname[0].toUpperCase() : "U"}
            </div>
          </button>

          {openUserDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-50">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
