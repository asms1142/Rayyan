"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";

interface TermsCondition {
  tc_id: number;
  title: string;
  content: string;
}

export default function AcceptTermsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const org_id = searchParams.get("org_id");
  const user_id = searchParams.get("user_id");

  const [activeTC, setActiveTC] = useState<TermsCondition | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchActiveTerms = async () => {
      if (!org_id || !user_id) return;
      const { data, error } = await supabase
        .from("terms_conditions")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) console.error("Error fetching active T&C:", error.message);
      else if (data)
        setActiveTC({
          tc_id: data.tc_id,
          title: data.title,
          content: data.content,
        });
    };

    fetchActiveTerms();
  }, [org_id, user_id]);

  const handleAccept = async () => {
    if (!accepted) {
      alert("You must agree to the Terms & Conditions to proceed.");
      return;
    }
    if (!org_id || !user_id || !activeTC) {
      alert("Invalid organization or user.");
      return;
    }

    setLoading(true);

    try {
      const orgIdNum = Number(org_id);
      const userIdNum = Number(user_id);

      // 1️⃣ Update organization.tc_accepted
      const { error: orgError } = await supabase
        .from("organization")
        .update({ tc_accepted: true })
        .eq("org_id", orgIdNum);
      if (orgError) throw orgError;

      // 2️⃣ Upsert org_tc_acceptance (pass array of objects, onConflict as string)
      const { error: orgTCError } = await supabase
        .from("org_tc_acceptance")
        .upsert([{ org_id: orgIdNum, tc_id: activeTC.tc_id }], {
          onConflict: "org_id", // Supabase TypeScript expects a single string
        });
      if (orgTCError) throw orgTCError;

      // 3️⃣ Upsert user_tc_acceptance
      const { error: userTCError } = await supabase
        .from("user_tc_acceptance")
        .upsert(
          [{ user_id: userIdNum, org_id: orgIdNum, tc_id: activeTC.tc_id }],
          { onConflict: "user_id" } // single string
        );
      if (userTCError) throw userTCError;

      alert("Terms accepted successfully!");
      router.push("/auth/org-login");
    } catch (err: any) {
      console.error(err);
      alert("Error accepting terms: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!activeTC)
    return <p className="p-6 text-center">Loading Terms & Conditions...</p>;

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-3xl bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">{activeTC.title}</h2>
        <div className="prose max-h-96 overflow-y-auto mb-4">
          <ReactMarkdown>{activeTC.content}</ReactMarkdown>
        </div>

        <label className="flex items-start gap-2 text-sm mb-4">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1"
          />
          <span>I have read and agree to the Terms & Conditions</span>
        </label>

        <button
          onClick={handleAccept}
          disabled={loading || !accepted}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded"
        >
          {loading ? "Processing..." : "Accept Terms"}
        </button>
      </div>
    </div>
  );
}
