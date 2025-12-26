"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PageWrapper from "@/components/ui/PageWrapper";
import { Loader } from "@/components/ui/Loader";
import { usePermission } from "@/hooks/usePermission";

/* ================= TYPES ================= */

interface DashboardStats {
  projects: number;
  contributors: number;
  opened: number;
  inProgress: number;
  heldUp: number;
  completed: number;
  archived: number;
}

/* ================= COMPONENT ================= */

export default function UsersDashboard() {
  const router = useRouter();
  const { authorized, loading: permissionLoading } =
    usePermission("users-dashboard");

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    projects: 0,
    contributors: 0,
    opened: 0,
    inProgress: 0,
    heldUp: 0,
    completed: 0,
    archived: 0,
  });

  /* ================= LOAD DASHBOARD ================= */

  useEffect(() => {
    if (!authorized) return;

    const loadDashboard = async () => {
      try {
        setLoading(true);

        /* -------- Auth -------- */
        const { data: session } = await supabase.auth.getSession();
        const authUid = session?.session?.user?.id;
        if (!authUid) return;

        /* -------- Userinfo -------- */
        const { data: me } = await supabase
          .from("userinfo")
          .select("user_id")
          .eq("auth_uid", authUid)
          .single();

        if (!me) return;
        const userId = me.user_id;

        /* -------- Accessible Projects -------- */
        const { data: logs } = await supabase
          .from("project_users_log")
          .select("project_id, proj_cont_id, status, accepted_at")
          .eq("user_id", userId)
          .order("action_date", { ascending: false });

        if (!logs || logs.length === 0) {
          setStats((s) => ({ ...s, projects: 0 }));
          return;
        }

        /* Keep only latest accepted access per project */
        const projectAccess: Record<number, any> = {};
        logs.forEach((l) => {
          if (!projectAccess[l.project_id] && l.accepted_at) {
            projectAccess[l.project_id] = l;
          }
        });

        const projectIds = Object.keys(projectAccess).map(Number);
        if (projectIds.length === 0) return;

        /* -------- Contributors -------- */
        const contributorIds = Object.values(projectAccess)
          .map((l) => l.proj_cont_id)
          .filter(Boolean);

        const uniqueContributors = new Set(contributorIds);

        /* -------- Tokens -------- */
        const { data: tokens } = await supabase
          .from("tokens")
          .select("status, project_id")
          .in("project_id", projectIds);

        let opened = 0;
        let inProgress = 0;
        let heldUp = 0;
        let completed = 0;
        let archived = 0;

        tokens?.forEach((t) => {
          switch (t.status) {
            case "Opened":
              opened++;
              break;
            case "In Progress":
              inProgress++;
              break;
            case "Held Up":
              heldUp++;
              break;
            case "Completed":
              completed++;
              break;
            case "Archived":
              archived++;
              break;
          }
        });

        setStats({
          projects: projectIds.length,
          contributors: uniqueContributors.size,
          opened,
          inProgress,
          heldUp,
          completed,
          archived,
        });
      } catch (err) {
        console.error("❌ User dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [authorized]);

  if (permissionLoading || loading)
    return <Loader message="Loading dashboard..." />;

  if (!authorized)
    return (
      <div className="p-10 text-center text-red-500 font-semibold">
        Unauthorized Access
      </div>
    );

  /* ================= UI ================= */

  return (
    <PageWrapper title="My Dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Projects"
          value={stats.projects}
          onClick={() => router.push("/protected/project-overview")}
        />
        <StatCard
          title="Contributors"
          value={stats.contributors}
          onClick={() => router.push("/protected/project-overview")}
        />
        <StatCard
          title="Opened Tickets"
          value={stats.opened}
          onClick={() => router.push("/protected/project-overview")}
        />
        <StatCard
          title="In Progress"
          value={stats.inProgress}
          onClick={() => router.push("/protected/project-overview")}
        />
        <StatCard
          title="Held Up"
          value={stats.heldUp}
          onClick={() => router.push("/protected/project-overview")}
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          onClick={() => router.push("/protected/project-overview")}
        />
        <StatCard
          title="Archived"
          value={stats.archived}
          onClick={() => router.push("/protected/project-overview")}
        />
      </div>
    </PageWrapper>
  );
}

/* ================= CARD ================= */

function StatCard({
  title,
  value,
  onClick,
}: {
  title: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white border rounded-xl p-6 shadow-sm cursor-pointer
                 hover:shadow-xl hover:bg-gray-50 hover:scale-[1.03]
                 transition-all duration-200"
    >
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
