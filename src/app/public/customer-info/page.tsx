"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";

// =========================
// Terms Modal Component
// =========================
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

  console.log("Modal rendered"); // Debug log

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white p-6 rounded-2xl max-w-3xl w-full shadow-lg relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold text-xl"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-center text-[var(--text-primary)]">
          {title}
        </h2>
        <div className="prose max-h-96 overflow-y-auto mb-4 text-[var(--text-secondary)]">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full mt-2 bg-[var(--primary)] hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// =========================
// Helper Functions
// =========================
function generateOrgCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function getUniqueOrgCode() {
  let code = generateOrgCode();
  let exists = true;

  while (exists) {
    const { data } = await supabase
      .from("organization")
      .select("org_id")
      .maybeSingle()
      .eq("org_code", code);

    if (!data) exists = false;
    else code = generateOrgCode();
  }

  return code;
}

// =========================
// Main Page
// =========================
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

  // =======================
  // Fetch Active Terms
  // =======================
  useEffect(() => {
    const fetchActiveTC = async () => {
      try {
        console.log("Fetching active T&C...");

        const { data, error } = await supabase
          .from("terms_conditions")
          .select("*");

        if (error) {
          console.error("Failed to fetch active T&C:", error.message);
        } else if (data) {
          console.log("All T&C fetched:", data); // Debug log

          // Filter active in JS
          const active = data.find((t: any) => t.is_active === true);
          if (active) {
            console.log("Active T&C found:", active); // Debug log
            setActiveTC({ tc_id: active.tc_id, title: active.title, content: active.content });
          } else {
            console.warn("No active T&C found"); // Debug log
          }
        }
      } catch (err) {
        console.error("Error fetching T&C:", err);
      }
    };

    fetchActiveTC();
  }, []);

  // =======================
  // Form Submit Handler
  // =======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTC) {
      alert("You must agree to the Terms & Conditions to continue.");
      return;
    }

    setLoading(true);

    try {
      const org_code = await getUniqueOrgCode();

      const { data: orgData, error: orgError } = await supabase
        .from("organization")
        .insert([{
          orgname,
          email,
          address,
          phone,
          sub_planid: plan_id,
          sub_type: trial ? "Trial" : "Under Subscription",
          is_trial: trial,
          email_verified: false,
          tc_accepted: true,
          org_code,
          comp_id: 1,
        }])
        .select()
        .maybeSingle();

      if (orgError || !orgData) throw new Error(orgError?.message || "Failed to create organization");
      const org_id = orgData.org_id;

      const response = await fetch("/api/create-org-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullname, nickname, email, org_id, phone, comp_id: 1 }),
      });

      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error);
      const user_id = result.user_id;

      await supabase.from("organization").update({ user_id, tc_accepted: true }).eq("org_id", org_id);
      await supabase.from("org_branch").insert([{
        org_id,
        comp_id: 1,
        branchname: `${orgname} Main Branch`,
        address,
        phone,
        email,
        user_id,
      }]);

      if (activeTC) {
        await supabase.from("org_tc_acceptance").insert({ org_id, tc_id: activeTC.tc_id });
      }

      alert(`Customer created successfully!\nOrganization Code: ${org_code}`);
      router.push("/public/auth/org-login");
    } catch (err: any) {
      console.error(err);
      alert("Unexpected error: " + err.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center bg-[var(--bg-app)] px-4 py-12 gap-10">
      {/* Left Illustration Panel */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 bg-[var(--primary)] text-white p-12 rounded-2xl shadow-lg">
        <h2 className="text-4xl font-bold mb-4">SaaS POS</h2>
        <p className="text-lg opacity-90">
          Enter your organization details to create an account and get started with your SaaS POS subscription.
        </p>
      </div>

      {/* Right Form Panel */}
      <form
        onSubmit={handleSubmit}
        className="w-full lg:w-1/2 max-w-2xl bg-white p-8 rounded-2xl shadow-lg space-y-6"
      >
        {/* Standardized Form Boxes */}
        {[
          { label: "Full Name", value: fullname, setter: setFullname, type: "text", required: true },
          { label: "Nickname", value: nickname, setter: setNickname, type: "text", required: true },
          { label: "Organization Name", value: orgname, setter: setOrgname, type: "text", required: true },
          { label: "Email", value: email, setter: setEmail, type: "email", required: true },
          { label: "Address", value: address, setter: setAddress, type: "text", required: false },
          { label: "Phone", value: phone, setter: setPhone, type: "text", required: true },
        ].map(({ label, value, setter, type, required }) => (
          <div key={label} className="flex flex-col">
            <label className="font-medium text-gray-700 mb-1">{label}{required && "*"}</label>
            <input
              type={type}
              value={value}
              onChange={(e) => setter(e.target.value)}
              className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              placeholder={label}
              required={required}
            />
          </div>
        ))}

        {/* Terms & Conditions */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={acceptedTC}
            onChange={(e) => setAcceptedTC(e.target.checked)}
            className="mt-1"
          />
          <span className="text-gray-700">
            I agree to the{" "}
            {activeTC ? (
              <a
                onClick={() => {
                  console.log("T&C clicked"); // Debug log
                  setModalOpen(true);
                }}
                className="text-[var(--primary)] underline hover:text-purple-700 cursor-pointer"
              >
                Terms & Conditions
              </a>
            ) : (
              "Terms & Conditions"
            )}
          </span>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-4">
          <button
            type="submit"
            disabled={loading || !acceptedTC}
            className="w-1/2 bg-[var(--primary)] hover:bg-purple-700 disabled:bg-gray-400 text-white p-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? "Processing..." : "Submit"}
          </button>
        </div>
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
