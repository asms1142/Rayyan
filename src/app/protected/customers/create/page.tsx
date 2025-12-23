"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageWrapper from "@/components/ui/PageWrapper";
import FormInput from "@/components/ui/FormInput";
import { Loader } from "@/components/ui/Loader";
import { usePermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";

export default function CustomerCreatePage() {
  const router = useRouter();

  // 🔐 RBAC
  const { permissions, authorized, loading } = usePermission("customers/create");

  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [form, setForm] = useState({
    cus_name: "",
    cus_address: "",
    cus_email: "",
    cus_mobile_no: "",
    cus_phone_no: "",
    note: "",
  });

  /* ---------------- AUTH + ORG LOAD ---------------- */
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();

      // 🚫 Not logged in → login page
      if (!data.session) {
        router.replace("/public/auth/login");
        return;
      }

      const { data: user } = await supabase
        .from("userinfo")
        .select("org_id, user_id")
        .eq("auth_uid", data.session.user.id)
        .single();

      if (!user) {
        router.replace("/public/auth/login");
        return;
      }

      setOrgId(user.org_id);
      setUserId(user.user_id);
      setAuthChecked(true);
    };

    init();
  }, [router]);

  /* ---------------- CUSTOMER CODE ---------------- */
  const generateCustomerCode = async (): Promise<string> => {
    if (!orgId) throw new Error("Organization not found");

    const { data } = await supabase
      .from("customer")
      .select("cus_code")
      .eq("org_id", orgId)
      .order("cus_id", { ascending: false })
      .limit(1);

    let next = 1;
    if (data?.length && data[0].cus_code) {
      next = parseInt(data[0].cus_code.replace(/\D/g, "")) + 1;
    }

    return `C-${String(next).padStart(5, "0")}`;
  };

  /* ---------------- SAVE ---------------- */
  const handleSubmit = async () => {
    if (!permissions.create) return alert("No create permission");
    if (!orgId || !userId) return alert("User organization missing");
    if (!form.cus_name.trim()) return alert("Customer name is required");

    setSaving(true);

    try {
      let cusCode = await generateCustomerCode();

      // 🔁 Double check uniqueness
      const { data: exists } = await supabase
        .from("customer")
        .select("cus_id")
        .eq("org_id", orgId)
        .eq("cus_code", cusCode)
        .limit(1);

      if (exists?.length) {
        cusCode = await generateCustomerCode();
      }

      const { error } = await supabase.from("customer").insert([
        {
          cus_code: cusCode,
          cus_name: form.cus_name,
          cus_address: form.cus_address,
          cus_email: form.cus_email,
          cus_mobile_no: form.cus_mobile_no,
          cus_phone_no: form.cus_phone_no,
          note: form.note,
          org_id: orgId,
          user_id: userId,
        },
      ]);

      if (error) throw error;

      router.push("/protected/customers");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- RENDER ---------------- */
  if (loading || !authChecked) {
    return <Loader message="Loading..." />;
  }

  if (!authorized) {
    return (
      <PageWrapper title="Unauthorized">
        <div className="text-center text-red-600 p-10">
          You do not have permission to access this page.
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Customer Entry"
      breadcrumb={[
        { label: "Customers", href: "/protected/customers" },
        { label: "Add Customer" },
      ]}
    >
      <div className="bg-white p-6 rounded-lg shadow max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Customer Name"
            value={form.cus_name}
            onChange={(e) => setForm({ ...form, cus_name: e.target.value })}
            required
          />
          <FormInput
            label="Email"
            value={form.cus_email}
            onChange={(e) => setForm({ ...form, cus_email: e.target.value })}
          />
          <FormInput
            label="Mobile"
            value={form.cus_mobile_no}
            onChange={(e) => setForm({ ...form, cus_mobile_no: e.target.value })}
          />
          <FormInput
            label="Phone"
            value={form.cus_phone_no}
            onChange={(e) => setForm({ ...form, cus_phone_no: e.target.value })}
          />
          <FormInput
            label="Address"
            value={form.cus_address}
            onChange={(e) => setForm({ ...form, cus_address: e.target.value })}
          />
          <FormInput
            label="Note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Save Customer
          </button>
          <button
            onClick={() => router.back()}
            className="bg-gray-300 px-6 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
