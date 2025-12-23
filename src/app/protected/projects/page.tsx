"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageWrapper from "@/components/ui/PageWrapper";
import { Loader } from "@/components/ui/Loader";
import { usePermission } from "@/hooks/usePermission";
import FormInput from "@/components/ui/FormInput";

/* ================= TYPES ================= */

interface Project {
  project_id: number;
  project_name: string;
  project_description: string | null;
  cus_id: number;
  org_id: number;
  cus_name: string;
  project_type: string;
  contributors: Contributor[];
  pendingInvites: Invite[];
}

interface Contributor {
  user_id: number;
  fullname: string;
  proj_cont_id: number;
}

interface Invite {
  pul_id: number;
  user_id: number;
  fullname: string;
  proj_cont_id: number;
}

interface ContributorType {
  proj_cont_id: number;
  title: string;
}

interface UserInfo {
  user_id: number;
  fullname: string;
  email: string;
}

/* ================= COMPONENT ================= */

export default function ProjectsPage() {
  const { authorized, loading: permissionLoading } = usePermission("projects");

  const [projects, setProjects] = useState<Project[]>([]);
  const [contributorTypes, setContributorTypes] = useState<ContributorType[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [emailSearch, setEmailSearch] = useState("");
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUsers, setFoundUsers] = useState<UserInfo[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);
  const [selectedContributorType, setSelectedContributorType] = useState<number | "">("");

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [orgId, setOrgId] = useState<number | null>(null);

  /* ================= FETCH ALL ================= */

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);

      // -------- AUTH USER --------
      const { data: session } = await supabase.auth.getSession();
      const authUid = session?.session?.user.id;
      if (!authUid) throw new Error("Not logged in");

      const { data: me, error: meErr } = await supabase
        .from("userinfo")
        .select("user_id, org_id")
        .eq("auth_uid", authUid)
        .single();

      if (meErr || !me) throw meErr;

      setCurrentUserId(me.user_id);
      setOrgId(me.org_id);

      // -------- CONTRIBUTOR TYPES --------
      const { data: ct } = await supabase
        .from("project_contributor")
        .select("proj_cont_id, title")
        .order("title");

      setContributorTypes(ct || []);

      // -------- PROJECTS --------
      const { data: proj } = await supabase
        .from("project")
        .select(`
          project_id,
          project_name,
          project_description,
          cus_id,
          org_id,
          customer:customer!inner(cus_name),
          project_type:project_type!inner(project_type)
        `)
        .eq("org_id", me.org_id)
        .order("project_name");

      // -------- PROJECT USER LOGS --------
      const { data: logs } = await supabase
        .from("project_users_log")
        .select(`
          pul_id,
          project_id,
          user_id,
          status,
          proj_cont_id,
          user:userinfo(fullname)
        `)
        .eq("org_id", me.org_id);

      const formatted: Project[] = (proj || []).map((p: any) => {
        const related = (logs || []).filter(
          (l) => l.project_id === p.project_id
        );

        return {
          project_id: p.project_id,
          project_name: p.project_name,
          project_description: p.project_description,
          cus_id: p.cus_id,
          org_id: p.org_id,
          cus_name: p.customer.cus_name,
          project_type: p.project_type.project_type,

          contributors: related
            .filter((l) => l.status === true)
            .map((l) => ({
              user_id: l.user_id,
              fullname: l.user?.fullname || "Unknown",
              proj_cont_id: l.proj_cont_id,
            })),

          pendingInvites: related
            .filter((l) => l.status === false)
            .map((l) => ({
              pul_id: l.pul_id,
              user_id: l.user_id,
              fullname: l.user?.fullname || "Unknown",
              proj_cont_id: l.proj_cont_id,
            })),
        };
      });

      setProjects(formatted);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FILTER ================= */

  const filteredProjects = useMemo(() => {
    return projects.filter((p) =>
      !search || p.project_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [projects, search]);

  /* ================= USER SEARCH ================= */

  const handleSearchUser = async () => {
    if (!emailSearch || !selectedProject || !orgId) return;

    try {
      setSearchingUser(true);
      setFoundUsers([]);

      const { data } = await supabase
        .from("userinfo")
        .select("user_id, fullname, email")
        .eq("org_id", orgId)
        .ilike("email", `%${emailSearch.toLowerCase()}%`);

      const excludeIds = [
        ...selectedProject.contributors.map((c) => c.user_id),
        ...selectedProject.pendingInvites.map((i) => i.user_id),
      ];

      setFoundUsers(
        (data || []).filter((u) => !excludeIds.includes(u.user_id))
      );
    } finally {
      setSearchingUser(false);
    }
  };

  /* ================= SEND INVITE ================= */

  const handleSendInvite = async () => {
    if (!selectedProject || !selectedUser || !selectedContributorType || !currentUserId) {
      alert("All fields are required");
      return;
    }

    const projContIdNum = Number(selectedContributorType);
    if (isNaN(projContIdNum)) {
      alert("Please select a valid contributor type");
      return;
    }

    try {
      const { error } = await supabase.from("project_users_log").insert({
        cus_id: selectedProject.cus_id,
        org_id: selectedProject.org_id,
        project_id: selectedProject.project_id,
        action_date: new Date().toISOString(),
        actioned_by: currentUserId,
        user_id: selectedUser.user_id,
        status: false,
        email_verified: false,
        proj_cont_id: projContIdNum,
        invite_token: crypto.randomUUID(),
      });

      if (error) {
        console.error("Invite error:", error);
        alert(`Failed to send invitation: ${error.message}`);
        return;
      }

      alert("Invitation sent");
      setOpenModal(false);
      fetchAll();
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Failed to send invitation");
    }
  };

  /* ================= RENDER ================= */

  if (permissionLoading || loading)
    return <Loader message="Loading projects..." />;

  if (!authorized)
    return <div className="p-10 text-center text-red-500">Unauthorized</div>;

  return (
    <PageWrapper title="Projects">
      <FormInput
        placeholder="Search project"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto bg-white rounded shadow mt-4">
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Project</th>
              <th className="border p-2">Customer</th>
              <th className="border p-2">Type</th>
              <th className="border p-2">Contributors</th>
              <th className="border p-2 text-center">Assign</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p) => (
              <tr key={p.project_id}>
                <td className="border p-2">{p.project_name}</td>
                <td className="border p-2">{p.cus_name}</td>
                <td className="border p-2">{p.project_type}</td>
                <td className="border p-2 text-sm">
                  {p.contributors.map((c) => (
                    <span
                      key={c.user_id}
                      className="mr-1 bg-green-100 px-2 rounded"
                    >
                      {c.fullname}
                    </span>
                  ))}
                  {p.pendingInvites.map((i) => (
                    <span
                      key={i.pul_id}
                      className="mr-1 bg-yellow-100 px-2 rounded"
                    >
                      {i.fullname} (Pending)
                    </span>
                  ))}
                </td>
                <td className="border p-2 text-center">
                  <button
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                    onClick={() => {
                      setSelectedProject(p);
                      setOpenModal(true);
                      setEmailSearch("");
                      setFoundUsers([]);
                      setSelectedUser(null);
                      setSelectedContributorType("");
                    }}
                  >
                    +
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL ================= */}
      {openModal && selectedProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-[420px] rounded p-6 space-y-3">
            <h3 className="font-semibold">Assign Contributor</h3>

            <FormInput
              placeholder="Search email"
              value={emailSearch}
              onChange={(e) => setEmailSearch(e.target.value)}
            />

            <button
              onClick={handleSearchUser}
              className="w-full bg-gray-200 rounded py-1"
            >
              {searchingUser ? "Searching..." : "Search"}
            </button>

            <select
              className="border w-full p-2 rounded"
              value={selectedUser?.user_id || ""}
              onChange={(e) =>
                setSelectedUser(
                  foundUsers.find(
                    (u) => u.user_id === Number(e.target.value)
                  ) || null
                )
              }
            >
              <option value="">Select user</option>
              {foundUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.fullname} ({u.email})
                </option>
              ))}
            </select>

            <select
              className="border w-full p-2 rounded"
              value={selectedContributorType}
              onChange={(e) =>
                setSelectedContributorType(Number(e.target.value))
              }
            >
              <option value="">Contributor type</option>
              {contributorTypes.map((t) => (
                <option key={t.proj_cont_id} value={t.proj_cont_id}>
                  {t.title}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenModal(false)}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvite}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
