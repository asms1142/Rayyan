"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageWrapper from "@/components/ui/PageWrapper";
import { Loader } from "@/components/ui/Loader";
import { usePermission } from "@/hooks/usePermission";
import FormInput from "@/components/ui/FormInput";
import { useRouter } from "next/navigation";
import { AiOutlineSearch, AiOutlineClose } from "react-icons/ai";

interface Project {
  project_id: number;
  project_name: string;
  project_type: string;
  cus_name: string;
  contributors: string[];
  tokensInProgress: number;
  tokensPending: number;
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

      const { data: logs } = await supabase
        .from("project_users_log")
        .select("project_id, status, action_date, accepted_at, proj_cont_id")
        .eq("user_id", userId)
        .order("action_date", { ascending: false });

      if (!logs) {
        setProjects([]);
        return;
      }

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

      const { data: projectsData } = await supabase
        .from("project")
        .select("project_id, project_name, proj_type_id, cus_id")
        .in("project_id", projectIds);

      const projTypeIds = projectsData.map((p) => p.proj_type_id);
      const { data: projTypes } = await supabase
        .from("project_type")
        .select("proj_type_id, project_type")
        .in("proj_type_id", projTypeIds);

      const cusIds = projectsData.map((p) => p.cus_id);
      const { data: customers } = await supabase
        .from("customer")
        .select("cus_id, cus_name")
        .in("cus_id", cusIds);

      const contIds = Object.values(latestLogs)
        .map((l) => l.proj_cont_id)
        .filter(Boolean);

      const { data: contributorsData } = await supabase
        .from("project_contributor")
        .select("proj_cont_id, title")
        .in("proj_cont_id", contIds);

      const projMap: Project[] = projectsData.map((p) => {
        const log = latestLogs[p.project_id];

        const projectType =
          projTypes?.find((pt) => pt.proj_type_id === p.proj_type_id)
            ?.project_type || "Unknown Type";

        const customerName =
          customers?.find((c) => c.cus_id === p.cus_id)?.cus_name ||
          "Unknown Customer";

        const contributorTitles =
          contributorsData
            ?.filter((c) => c.proj_cont_id === log.proj_cont_id)
            .map((c) => c.title) || [];

        return {
          project_id: p.project_id,
          project_name: p.project_name,
          project_type: projectType,
          cus_name: customerName,
          contributors: contributorTitles,
          tokensInProgress: Math.floor(Math.random() * 5), // placeholder
          tokensPending: Math.floor(Math.random() * 3), // placeholder
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
        p.cus_name.toLowerCase().includes(search.toLowerCase())
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
      {/* 🔍 Search */}
      <div className="relative mb-6">
        <AiOutlineSearch
          className="absolute top-3 left-3 text-gray-400"
          size={18}
        />
        <FormInput
          placeholder="Search by Project or Customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-10"
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
            onClick={() =>
              router.push(
                `/protected/project-tokens/${p.project_id}`
              )
            }
          >
            <h3 className="font-bold text-xl mb-2">
              {p.project_name}
            </h3>
            <p className="text-gray-600 text-sm mb-1">
              Project Type: {p.project_type}
            </p>
            <p className="text-gray-600 text-sm mb-3">
              Customer: {p.cus_name}
            </p>

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

            <div className="flex gap-3">
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                Token In Progress ({p.tokensInProgress})
              </span>
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                Token Pending ({p.tokensPending})
              </span>
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
