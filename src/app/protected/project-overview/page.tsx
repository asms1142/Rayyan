"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageWrapper from "@/components/ui/PageWrapper";
import { Loader } from "@/components/ui/Loader";
import FormInput from "@/components/ui/FormInput";
import { usePermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import { AiOutlineSearch, AiOutlineClose } from "react-icons/ai";

interface Project {
  project_id: number;
  project_name: string;
  project_type: string;
  cus_name: string;
  contributors: string[]; // nicknames
  tickets: {
    open: number;
    inProgress: number;
    heldUp: number;
    completed: number;
    archived: number;
  };
}

export default function ProjectOverview() {
  const router = useRouter();
  const { authorized, loading: permissionLoading } =
    usePermission("project-overview");

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);

      // 1️⃣ Get logged-in user
      const { data: session } = await supabase.auth.getSession();
      const authUid = session?.session?.user.id;
      if (!authUid) throw new Error("Not logged in");

      const { data: me } = await supabase
        .from("userinfo")
        .select("user_id, org_id")
        .eq("auth_uid", authUid)
        .single();
      if (!me) throw new Error("Userinfo not found");
      const userId = me.user_id;

      // 2️⃣ Get latest project logs for the user
      const { data: logs } = await supabase
        .from("project_users_log")
        .select(
          "project_id, proj_cont_id, status, accepted_at, user_id"
        )
        .eq("user_id", userId)
        .order("action_date", { ascending: false });

      if (!logs || logs.length === 0) {
        setProjects([]);
        return;
      }

      // Only keep latest accepted log per project
      const latestLogs: Record<number, any> = {};
      logs.forEach((log) => {
        if (!latestLogs[log.project_id] && log.status && log.accepted_at) {
          latestLogs[log.project_id] = log;
        }
      });

      const projectIds = Object.keys(latestLogs).map(Number);
      if (projectIds.length === 0) {
        setProjects([]);
        return;
      }

      // 3️⃣ Fetch projects and related info
      const { data: projectsData } = await supabase
        .from("project")
        .select("project_id, project_name, proj_type_id, cus_id")
        .in("project_id", projectIds);

      const projTypeIds = (projectsData ?? []).map((p) => p.proj_type_id);
      const { data: projTypes } = await supabase
        .from("project_type")
        .select("proj_type_id, project_type")
        .in("proj_type_id", projTypeIds);

      if (!projectsData || projectsData.length === 0) {
  return;
}

const cusIds = projectsData.map((p) => p.cus_id);
      const { data: customers } = await supabase
        .from("customer")
        .select("cus_id, cus_name")
        .in("cus_id", cusIds);

      // 4️⃣ Fetch contributors nicknames from userinfo via project_users_log
      const { data: contributorsData } = await supabase
        .from("project_users_log")
        .select("user_id, project_id, accepted_at")
        .in("project_id", projectIds)
        .not("accepted_at", "is", null);

      const userIds = contributorsData?.map((c) => c.user_id) || [];

      const { data: users } = await supabase
        .from("userinfo")
        .select("user_id, nickname")
        .in("user_id", userIds);

      const contributorsMap: Record<number, string[]> = {};
      projectIds.forEach((pid) => (contributorsMap[pid] = []));

      contributorsData?.forEach((c) => {
        const user = users?.find((u) => u.user_id === c.user_id);
        if (user) {
          contributorsMap[c.project_id].push(user.nickname);
        }
      });

      // 5️⃣ Fetch token counts per project per status
      const { data: tokens } = await supabase
        .from("tokens")
        .select("project_id, status")
        .in("project_id", projectIds);

      const ticketsMap: Record<number, Project["tickets"]> = {};
      projectIds.forEach((pid) => {
        ticketsMap[pid] = {
          open: 0,
          inProgress: 0,
          heldUp: 0,
          completed: 0,
          archived: 0,
        };
      });

      tokens?.forEach((t) => {
        const pid = t.project_id;
        if (!ticketsMap[pid]) return;
        switch (t.status) {
          case "Opened":
            ticketsMap[pid].open += 1;
            break;
          case "In Progress":
            ticketsMap[pid].inProgress += 1;
            break;
          case "Held Up":
            ticketsMap[pid].heldUp += 1;
            break;
          case "Completed":
            ticketsMap[pid].completed += 1;
            break;
          case "Archived":
            ticketsMap[pid].archived += 1;
            break;
        }
      });

      // 6️⃣ Map projects
      const projMap: Project[] = projectsData.map((p) => {
        const projectType =
          projTypes?.find((pt) => pt.proj_type_id === p.proj_type_id)
            ?.project_type || "Unknown Type";

        const customerName =
          customers?.find((c) => c.cus_id === p.cus_id)?.cus_name ||
          "Unknown Customer";

        return {
          project_id: p.project_id,
          project_name: p.project_name,
          project_type: projectType,
          cus_name: customerName,
          contributors: contributorsMap[p.project_id] || [],
          tickets: ticketsMap[p.project_id],
        };
      });

      setProjects(projMap);
    } catch (err) {
      console.error("❌ Fetch projects error:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(
      (p) =>
        !search ||
        p.project_name.toLowerCase().includes(search.toLowerCase()) ||
        p.cus_name.toLowerCase().includes(search.toLowerCase()) ||
        p.contributors.some((c) =>
          c.toLowerCase().includes(search.toLowerCase())
        )
    );
  }, [projects, search]);

  if (permissionLoading || loading)
    return <Loader message="Loading projects..." />;

  if (!authorized)
    return (
      <div className="p-10 text-center text-red-500">Unauthorized</div>
    );

  return (
    <PageWrapper title="Project Overview">
      {/* 🔍 Professional Search Box */}
      <div className="relative mb-6 w-full max-w-md mx-auto">
        <AiOutlineSearch className="absolute top-3 left-3 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Search projects, customers, contributors"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          >
            <AiOutlineClose size={20} />
          </button>
        )}
      </div>

      {/* 📦 Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length === 0 && (
          <div className="col-span-full text-center text-gray-400">
            No projects found
          </div>
        )}

        {filteredProjects.map((p) => (
          <div
            key={p.project_id}
            className="bg-white border rounded-lg p-5 shadow-md hover:shadow-xl transition cursor-pointer hover:scale-[1.02] hover:bg-gray-50"
            onClick={() => router.push(`/protected/project-tokens/${p.project_id}`)}
          >
            <h3 className="font-bold text-xl mb-2">{p.project_name}</h3>
            <p className="text-gray-600 text-sm mb-1">Project Type: {p.project_type}</p>
            <p className="text-gray-600 text-sm mb-3">Customer: {p.cus_name}</p>

            {/* Contributors */}
            <div className="flex flex-wrap gap-2 mb-3">
              {p.contributors.slice(0, 6).map((c, idx) => (
                <span
                  key={idx}
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                >
                  {c}
                </span>
              ))}
              {p.contributors.length > 6 && (
                <span className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                  +{p.contributors.length - 6} more
                </span>
              )}
            </div>

            {/* Ticket Statuses */}
            <div className="grid grid-cols-2 gap-2 text-xs mb-1">
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                Open ({p.tickets.open})
              </span>
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                In Progress ({p.tickets.inProgress})
              </span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                Held Up ({p.tickets.heldUp})
              </span>
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                Completed ({p.tickets.completed})
              </span>
              <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                Archived ({p.tickets.archived})
              </span>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
