"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import FormInput from "@/components/ui/FormInput";
import { Loader } from "@/components/ui/Loader";

/* ================= TYPES ================= */
interface Props {
  open: boolean;
  onClose: () => void;
}

interface UserProfile {
  user_id: number;
  fullname: string;
  nickname: string;
  email: string;
  phone: string;
}

/* ================= COMPONENT ================= */
export default function ProfileModal({ open, onClose }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullname: "",
    nickname: "",
    phone: "",
  });

  /* ================= FETCH PROFILE ================= */
  const fetchProfile = async () => {
    try {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      const authUid = authData?.user?.id;

      if (!authUid) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("userinfo")
        .select("user_id, fullname, nickname, email, phone")
        .eq("auth_uid", authUid)
        .single();

      if (error) {
        console.error("❌ Userinfo fetch error:", error);
        setProfile(null);
        return;
      }

      if (!data) {
        console.warn("⚠️ No userinfo found for auth_uid:", authUid);
        setProfile(null);
        return;
      }

      setProfile(data);
      setForm({
        fullname: data.fullname || "",
        nickname: data.nickname || "",
        phone: data.phone || "",
      });
    } catch (err) {
      console.error("❌ Failed to fetch profile:", err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UPDATE PROFILE ================= */
  const handleUpdate = async () => {
    if (!profile) return;

    if (!form.fullname.trim()) {
      alert("Full Name is required");
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("userinfo")
        .update({
          fullname: form.fullname.trim(),
          nickname: form.nickname.trim(),
          phone: form.phone.trim(),
          updated_at: new Date(),
        })
        .eq("user_id", profile.user_id);

      if (error) throw error;

      alert("Profile updated successfully!");
      onClose();
    } catch (err: any) {
      console.error("❌ Profile update failed:", err);
      alert(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  /* ================= EFFECT ================= */
  useEffect(() => {
    if (open) fetchProfile();
  }, [open]);

  if (!open) return null;

  /* ================= UI ================= */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">My Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-xl">
            ✕
          </button>
        </div>

        {loading ? (
          <Loader message="Loading profile..." />
        ) : profile ? (
          <>
            {/* FORM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="Full Name"
                value={form.fullname}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
              />
              <FormInput
                label="Nickname"
                value={form.nickname}
                onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              />
              <FormInput label="Email" value={profile.email} disabled />
              <FormInput
                label="Phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            {/* ACTIONS */}
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 border rounded">
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Update"}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-500">Profile not found</div>
        )}
      </div>
    </div>
  );
}
