// app/customer-info/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CustomerInfoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const plan_id = searchParams.get("plan_id");
  const trial = searchParams.get("trial") === "1";

  const [fullname, setFullname] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [orgname, setOrgname] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ----------------------------------------------------
      // 1️⃣ Create organization record
      // ----------------------------------------------------
      const { data: orgData, error: orgError } = await supabase
        .from("organization")
        .insert([
          {
            orgname,
            email,
            address,
            phone,
            sub_planid: plan_id,
            sub_type: trial ? "Trial" : "Under Subscription",
            is_trial: trial,
            email_verified: false,
            comp_id: 1,
          },
        ])
        .select()
        .single();

      if (orgError || !orgData) {
        alert("Error creating organization: " + orgError?.message);
        setLoading(false);
        return;
      }

      const org_id = orgData.org_id;

      // ----------------------------------------------------
      // 2️⃣ Call server API to create auth user + userinfo
      //    - Sends secure invite email to set password
      // ----------------------------------------------------
      const response = await fetch("/api/create-org-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullname,
          nickname,
          email,
          org_id,
          phone,
          comp_id: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        alert("Auth create error: " + result.error);
        setLoading(false);
        return;
      }

      const user_id = result.user_id;

      // ----------------------------------------------------
      // 3️⃣ Update organization owner with user_id
      // ----------------------------------------------------
      await supabase
        .from("organization")
        .update({ user_id })
        .eq("org_id", org_id);

      // ----------------------------------------------------
      // 4️⃣ Add default main branch
      // ----------------------------------------------------
      await supabase.from("org_branch").insert([
        {
          org_id,
          comp_id: 1,
          branchname: `${orgname} Main Branch`,
          address,
          phone,
          email,
          user_id,
        },
      ]);

      // ----------------------------------------------------
      // 5️⃣ Inform user to check email for secure login
      // ----------------------------------------------------
      alert(
        "Customer created successfully! Please check your email to set your password and verify your account."
      );

      // ----------------------------------------------------
      // 6️⃣ Redirect to org login
      // ----------------------------------------------------
      router.push("/auth/org-login");
    } catch (err: any) {
      console.error(err);
      alert("Unexpected error: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 px-4 py-10">
      <h2 className="text-3xl font-bold mb-6">Customer Information</h2>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow space-y-4"
      >
        <input
          type="text"
          placeholder="Full Name"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Organization Name"
          value={orgname}
          onChange={(e) => setOrgname(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <input
          type="text"
          placeholder="Address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border p-2 rounded"
        />
        <input
          type="text"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
        >
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
