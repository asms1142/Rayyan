"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageWrapper from "@/components/ui/PageWrapper";
import { Loader } from "@/components/ui/Loader";
import { usePermission } from "@/hooks/usePermission";
import FormInput from "@/components/ui/FormInput";

/* ================= TYPES ================= */

interface UserProfile {
  user_id: number;
  fullname: string;
  nickname: string;
  email: string;
  mobile_no?: string;
  org_id?: number;
  created_at: string;
}

/* ================= COMPONENT ================= */

export default function ProfilePage() {
  /** RBAC */
  const { authorized, loading: permissionLoading } =
    usePermission("profile");

  /** State */
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullname: "",
    nickname: "",
    mobile_no: "",
  });

  /* ================= FETCH PROFILE ================= */

  const fetchProfile = async () => {
    try {
      setLoading(true);

      const { data: session } = await supabase.auth.getSession();
      const authUid = session?.session?.user.id;

      if (!authUid) throw new Error("No active session");

      const { data, error } = await supabase
        .from("userinfo")
        .select(`
          user_id,
          fullname,
          nickname,
          email,
          mobile_no,
          org_id,
          created_at
        `)
        .eq("auth_uid", authUid)
        .single();

      if (error) throw error;

      setProfile(data);
      setForm({
        fullname: data.fullname || "",
        nickname: data.nickname || "",
        mobile_no: data.mobile_no || "",
      });
    } catch (err) {
      console.error("❌ Failed to load profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPDATE PROFILE ================= */

  const handleUpdate = async () => {
    if (!profile) return;

    if (!form.fullname.trim()) {
      alert("Full name is required");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("userinfo")
        .update({
          fullname: form.fullname.trim(),
          nickname: form.nickname.trim(),
          mobile_no: form.mobile_no.trim() || null,
          updated_at: new Date(),
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      alert("Profile updated successfully");
      await fetchProfile();
    } catch (err: any) {
      console.error("❌ Update failed:", err);
      alert(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  /* ================= INIT ================= */

  useEffect(() => {
    if (authorized) fetchProfile();
  }, [authorized]);

  /* ================= UI STATES ================= */

  if (permissionLoading || loading)
    return <Loader message="Loading profile..." />;

  if (!authorized)
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Unauthorized Access
      </div>
    );

  if (!profile)
    return (
      <div className="p-10 text-center text-gray-500">
        Profile not found
      </div>
    );

  /* ================= RENDER ================= */

  return (
    <PageWrapper
      title="My Profile"
      breadcrumb={[
        { label: "Home", href: "/protected/dashboard" },
        { label: "Profile" },
      ]}
    >
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6 space-y-6">
        {/* BASIC INFO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Full Name"
            value={form.fullname}
            onChange={(e) =>
              setForm({ ...form, fullname: e.target.value })
            }
          />

          <FormInput
            label="Nickname"
            value={form.nickname}
            onChange={(e) =>
              setForm({ ...form, nickname: e.target.value })
            }
          />

          <FormInput
            label="Email"
            value={profile.email}
            disabled
          />

          <FormInput
            label="Mobile No"
            value={form.mobile_no}
            onChange={(e) =>
              setForm({ ...form, mobile_no: e.target.value })
            }
          />
        </div>

        {/* META */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>User ID:</strong> {profile.user_id}
          </div>
          <div>
            <strong>Organization ID:</strong>{" "}
            {profile.org_id || "-"}
          </div>
          <div>
            <strong>Joined:</strong>{" "}
            {new Date(profile.created_at).toLocaleString()}
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex gap-3">
          <button
            onClick={handleUpdate}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update Profile"}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
