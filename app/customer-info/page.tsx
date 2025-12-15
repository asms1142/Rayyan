// app/customer-info/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";

// Modal component with Markdown support
function TermsModal({
  open,
  onClose,
  title,
  content,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  content: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg max-w-3xl w-full shadow-lg relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 font-bold text-lg"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center">{title}</h2>
        <div className="prose max-h-96 overflow-y-auto mb-4">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        <button
          onClick={onClose}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Generate random org_code
function generateOrgCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Ensure unique org_code
async function getUniqueOrgCode() {
  let code = generateOrgCode();
  let exists = true;

  while (exists) {
    const { data } = await supabase
      .from("organization")
      .select("org_id")
      .eq("org_code", code)
      .single();

    if (!data) exists = false;
    else code = generateOrgCode();
  }

  return code;
}

export default function CustomerInfoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const plan_id = searchParams.get("plan_id");
  const trial = searchParams.get("trial") === "1";

  // Form states
  const [fullname, setFullname] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [orgname, setOrgname] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const [acceptedTC, setAcceptedTC] = useState(false);
  const [loading, setLoading] = useState(false);

  // Active T&C
  const [activeTC, setActiveTC] = useState<{ tc_id: number; title: string; content: string } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchActiveTC = async () => {
      const { data, error } = await supabase
        .from("terms_conditions")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error) console.error("Failed to fetch active T&C:", error.message);
      else if (data) setActiveTC({ tc_id: data.tc_id, title: data.title, content: data.content });
    };
    fetchActiveTC();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTC) {
      alert("You must agree to the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);

    try {
      const org_code = await getUniqueOrgCode();

      // 1️⃣ Create organization
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
            tc_accepted: true, // ✅ mark T&C accepted
            org_code, // ✅ unique org code
            comp_id: 1,
          },
        ])
        .select()
        .single();

      if (orgError || !orgData) throw new Error(orgError?.message || "Failed to create organization");
      const org_id = orgData.org_id;

      // 2️⃣ Create auth user via API
      const response = await fetch("/api/create-org-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, nickname, email, org_id, phone, comp_id: 1 }),
      });

      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error);
      const user_id = result.user_id;

      // 3️⃣ Update org owner and ensure tc_accepted remains TRUE
      await supabase
        .from("organization")
        .update({ user_id, tc_accepted: true })
        .eq("org_id", org_id);

      // 4️⃣ Default main branch
      await supabase.from("org_branch").insert([
        { org_id, comp_id: 1, branchname: `${orgname} Main Branch`, address, phone, email, user_id },
      ]);

      // 5️⃣ Save T&C acceptance for org only
      if (activeTC) {
        await supabase.from("org_tc_acceptance").insert({ org_id, tc_id: activeTC.tc_id });
      }

      alert(
        `Customer created successfully!\n\nOrganization Code: ${org_code}\n\nPlease check your email to set your password and complete the account setup.`
      );

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

      <form onSubmit={handleSubmit} className="w-full max-w-md bg-white p-6 rounded-lg shadow space-y-4">
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

        {/* T&C Checkbox + Modal */}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={acceptedTC}
            onChange={(e) => setAcceptedTC(e.target.checked)}
            className="mt-1"
          />
          <span>
            I agree to the{" "}
            {activeTC ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="text-blue-600 underline"
              >
                Terms & Conditions
              </button>
            ) : (
              "Terms & Conditions"
            )}
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !acceptedTC}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white p-2 rounded"
        >
          {loading ? "Processing..." : "Submit"}
        </button>
      </form>

      {/* Terms Modal */}
      {activeTC && (
        <TermsModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={activeTC.title}
          content={activeTC.content}
        />
      )}
    </div>
  );
}
