"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader } from "@/components/ui/Loader";

/* ================= TYPES ================= */

interface OrgSummary {
  org_id: number;
  orgname: string;
  customers: number;
  projects: number;
  users: number;
  tokens: number;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);

  /* Left summary */
  const [totalOrgs, setTotalOrgs] = useState(0);
  const [trialOrgs, setTrialOrgs] = useState(0);
  const [subscribedOrgs, setSubscribedOrgs] = useState(0);

  /* Right table */
  const [orgSummaries, setOrgSummaries] = useState<OrgSummary[]>([]);

  /* ================= LOAD DASHBOARD ================= */

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);

      try {
        /* ---------- Organizations ---------- */
        const { data: orgs, error: orgErr } = await supabase
          .from("organization")
          .select("org_id, orgname, sub_type, is_trial");

        if (orgErr || !orgs) throw orgErr;

        setTotalOrgs(orgs.length);
        setTrialOrgs(
          orgs.filter(
            (o) => o.sub_type === "Trial" || o.is_trial === true
          ).length
        );
        setSubscribedOrgs(
          orgs.filter((o) => o.sub_type === "Under Subscription").length
        );

        /* ---------- Customers ---------- */
        const { data: customers } = await supabase
          .from("customer")
          .select("cus_id, org_id");

        /* ---------- Projects ---------- */
        const { data: projects } = await supabase
          .from("project")
          .select("project_id, org_id");

        /* ---------- Users ---------- */
        const { data: users } = await supabase
          .from("userinfo")
          .select("user_id, org_id");

        /* ---------- Tokens ---------- */
        const { data: tokens } = await supabase
          .from("tokens")
          .select("token_id, org_id");

        /* ---------- Build summary ---------- */
        const summary: OrgSummary[] = orgs.map((org) => ({
          org_id: org.org_id,
          orgname: org.orgname,
          customers:
            customers?.filter((c) => c.org_id === org.org_id).length ?? 0,
          projects:
            projects?.filter((p) => p.org_id === org.org_id).length ?? 0,
          users:
            users?.filter((u) => u.org_id === org.org_id).length ?? 0,
          tokens:
            tokens?.filter((t) => t.org_id === org.org_id).length ?? 0,
        }));

        setOrgSummaries(summary);
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) return <Loader />;

  /* ================= UI ================= */

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Platform Dashboard</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT SIDE ================= */}
        <div className="space-y-4">
          <DashboardCard
            title="Total Organizations"
            value={totalOrgs}
          />
          <DashboardCard
            title="Trial Period"
            value={trialOrgs}
          />
          <DashboardCard
            title="Under Subscriptions"
            value={subscribedOrgs}
          />
        </div>

        {/* ================= RIGHT SIDE ================= */}
        <div className="lg:col-span-2 bg-white border rounded-lg overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Organization</th>
                <th className="px-4 py-2 text-center">Customers</th>
                <th className="px-4 py-2 text-center">Projects</th>
                <th className="px-4 py-2 text-center">Users</th>
                <th className="px-4 py-2 text-center">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {orgSummaries.map((org) => (
                <tr key={org.org_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">
                    {org.orgname}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {org.customers}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {org.projects}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {org.users}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {org.tokens}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL CARD ================= */

function DashboardCard({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="bg-white border rounded-lg p-5 shadow-sm">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
