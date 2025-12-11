// app/customer-info/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function CustomerInfoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan_id = searchParams.get("plan_id");
  const trial = searchParams.get("trial") === "true";

  const [fullname, setFullname] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgname, setOrgname] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1️⃣ Insert organization
    const { data: orgData, error: orgError } = await supabase
      .from("organization")
      .insert([
        {
          orgname,
          address,
          phone,
          email,
          sub_planid: plan_id,
          sub_type: trial ? "Trial" : "Under Subscription",
          email_verified: false,
          comp_id: 1, // default company
        },
      ])
      .select()
      .single();

    if (orgError) {
      alert(orgError.message);
      return;
    }

    const org_id = orgData.org_id;

    // 2️⃣ Insert user
    const { data: userData, error: userError } = await supabase
      .from("userinfo")
      .insert([
        {
          fullname,
          nickname,
          email,
          username: email,
          password,
          role_id: 3, // user role
          org_id,
          comp_id: 1,
        },
      ])
      .select()
      .single();

    if (userError) {
      alert(userError.message);
      return;
    }

    const user_id = userData.user_id;

    // 3️⃣ Update organization with user_id
    await supabase
      .from("organization")
      .update({ user_id })
      .eq("org_id", org_id);

    // 4️⃣ Insert default org_branch
    await supabase.from("org_branch").insert([
      {
        org_id,
        comp_id: 1,
        branchname: orgname + " Main Branch",
        address,
        phone,
        email,
        user_id,
      },
    ]);

    // 5️⃣ TODO: send email verification with 4 hours expiry

    alert("Customer created! Please check your email to verify.");
    router.push("/"); // redirect to homepage or login
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
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        />
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
