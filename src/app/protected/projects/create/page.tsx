"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageWrapper from "@/components/ui/PageWrapper";
import { usePermission } from "@/hooks/usePermission";
import { Loader } from "@/components/ui/Loader";
import FormInput from "@/components/ui/FormInput";

interface Customer {
  cus_id: number;
  cus_name: string;
}

interface ProjectType {
  proj_type_id: number;
  project_type: string;
}

export default function CreateProjectPage() {
  /** RBAC */
  const { authorized, loading: permissionLoading, permissions } =
    usePermission("projects/create");

  /** State */
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);

  const [projectName, setProjectName] = useState("");
  const [projectTypeId, setProjectTypeId] = useState<number | "">("");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [projectDesc, setProjectDesc] = useState("");

  const [orgId, setOrgId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  /** New Project Type */
  const [showNewType, setShowNewType] = useState(false);
  const [newProjectType, setNewProjectType] = useState("");

  const [loading, setLoading] = useState(true);

  /** Initial Load */
  useEffect(() => {
    const init = async () => {
      setLoading(true);

      try {
        /** Auth */
        const { data: sessionData } = await supabase.auth.getSession();
        const authUid = sessionData?.session?.user.id;
        if (!authUid) throw new Error("No session");

        /** User Info */
        const { data: userinfo, error: userErr } = await supabase
          .from("userinfo")
          .select("user_id, org_id")
          .eq("auth_uid", authUid)
          .single();

        if (userErr) throw userErr;

        setOrgId(userinfo.org_id);
        setUserId(userinfo.user_id);

        /** Customers */
        const { data: cusData } = await supabase
          .from("customer")
          .select("cus_id, cus_name")
          .eq("org_id", userinfo.org_id)
          .order("cus_name");

        setCustomers(cusData || []);

        /** Project Types */
        await loadProjectTypes(userinfo.org_id);
      } catch (err) {
        console.error("Init error:", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  /** Load Project Types */
  const loadProjectTypes = async (org_id: number) => {
    const { data } = await supabase
      .from("project_type")
      .select("proj_type_id, project_type")
      .eq("org_id", org_id)
      .order("project_type");

    setProjectTypes(data || []);
  };

  /** Create Project Type Inline */
  const handleCreateProjectType = async () => {
    if (!newProjectType.trim() || !orgId || !userId) return;

    try {
      const { data, error } = await supabase
        .from("project_type")
        .insert([
          {
            project_type: newProjectType.trim(),
            org_id: orgId,
            cus_id: customerId || null,
            user_id: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setNewProjectType("");
      setShowNewType(false);
      await loadProjectTypes(orgId);
      setProjectTypeId(data.proj_type_id);
    } catch (err: any) {
      alert(err.message || "Failed to create project type");
    }
  };

  /** Submit Project */
  const handleSubmit = async () => {
    if (!permissions.create) return alert("No permission");

    if (!projectName || !customerId || !projectTypeId || !orgId) {
      return alert("Please fill all required fields");
    }

    try {
      const { error } = await supabase.from("project").insert([
        {
          project_name: projectName,
          proj_type_id: projectTypeId,
          cus_id: customerId,
          org_id: orgId,
          project_description: projectDesc,
        },
      ]);

      if (error) throw error;

      alert("Project created successfully");

      setProjectName("");
      setProjectTypeId("");
      setCustomerId("");
      setProjectDesc("");
    } catch (err) {
      console.error(err);
      alert("Failed to create project");
    }
  };

  /** UI States */
  if (permissionLoading || loading)
    return <Loader message="Loading project form..." />;

  if (!authorized)
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Unauthorized Access
      </div>
    );

  return (
    <PageWrapper
      title="Create Project"
      breadcrumb={[
        { label: "Home", href: "/protected/dashboard" },
        { label: "Projects", href: "/protected/projects" },
        { label: "Create" },
      ]}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer */}
          <div>
            <label className="block mb-1 font-medium">Customer *</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={customerId}
              onChange={(e) => setCustomerId(Number(e.target.value))}
            >
              <option value="">Select Customer</option>
              {customers.map((c) => (
                <option key={c.cus_id} value={c.cus_id}>
                  {c.cus_name}
                </option>
              ))}
            </select>
          </div>

          {/* Project Type */}
          <div>
            <label className="block mb-1 font-medium">Project Type *</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={projectTypeId}
              onChange={(e) => {
                if (e.target.value === "new") {
                  setShowNewType(true);
                  setProjectTypeId("");
                } else {
                  setProjectTypeId(Number(e.target.value));
                }
              }}
            >
              <option value="">Select Project Type</option>

              {projectTypes.map((t) => (
                <option key={t.proj_type_id} value={t.proj_type_id}>
                  {t.project_type}
                </option>
              ))}

              <option value="new">+ Add New Project Type</option>
            </select>

            {showNewType && (
              <div className="mt-2 flex gap-2">
                <input
                  className="flex-1 border px-3 py-2 rounded"
                  placeholder="New Project Type"
                  value={newProjectType}
                  onChange={(e) => setNewProjectType(e.target.value)}
                />
                <button
                  onClick={handleCreateProjectType}
                  className="bg-blue-600 text-white px-4 rounded"
                >
                  Add
                </button>
              </div>
            )}
          </div>

          {/* Project Name */}
          <div>
            <label className="block mb-1 font-medium">Project Name *</label>
            <FormInput
              placeholder="Enter Project Name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block mb-1 font-medium">
              Project Description
            </label>
            <textarea
              className="w-full border px-3 py-2 rounded"
              rows={4}
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          Create Project
        </button>
      </div>
    </PageWrapper>
  );
}
