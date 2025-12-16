"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface TermsCondition {
  tc_id: number;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  effective_from: string;
  created_at: string;
}

type PermissionKey = "view" | "create" | "edit" | "delete" | "pdf" | "export";

export default function TermsConditionsManagement() {
  const router = useRouter();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);

  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({
    view: false,
    create: false,
    edit: false,
    delete: false,
    pdf: false,
    export: false,
  });

  const [termsList, setTermsList] = useState<TermsCondition[]>([]);
  const [editingTC, setEditingTC] = useState<TermsCondition | null>(null);

  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [content, setContent] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [isActive, setIsActive] = useState(false);

  /* =====================================================
     INITIAL AUTH + VIEW CHECK (PAGE LOAD ONLY)
  ===================================================== */
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/auth/login");
        return;
      }

      const { data: userinfo } = await supabase
        .from("userinfo")
        .select("role_id")
        .eq("auth_uid", session.user.id)
        .single();

      if (!userinfo?.role_id) {
        router.replace("/unauthorized");
        return;
      }

      const { data: menu } = await supabase
        .from("module_menu")
        .select("id")
        .eq("page_name", "terms-conditions")
        .single();

      if (!menu?.id) {
        router.replace("/unauthorized");
        return;
      }

      const { data: access } = await supabase
        .from("menu_access")
        .select("view, create, edit, delete, pdf, export")
        .eq("menu_id", menu.id)
        .eq("role_id", userinfo.role_id)
        .maybeSingle();

      if (!access || !access.view) {
        router.replace("/unauthorized");
        return;
      }

      setRoleId(userinfo.role_id);
      setMenuId(menu.id);
      setPermissions(access);
      setAuthorized(true);

      fetchTerms();
    };

    init();
  }, [router]);

  /* =====================================================
     PERMISSION RECHECK (CRITICAL SECURITY FIX)
  ===================================================== */
  const checkPermission = async (permission: PermissionKey): Promise<boolean> => {
    if (!menuId || !roleId) return false;

    const { data } = await supabase
      .from("menu_access")
      .select(permission)
      .eq("menu_id", menuId)
      .eq("role_id", roleId)
      .maybeSingle();

    if (!data || !data[permission]) {
      alert("Permission revoked. Please reload.");
      return false;
    }

    return true;
  };

  /* =====================================================
     DATA FETCH
  ===================================================== */
  const fetchTerms = async () => {
    const { data } = await supabase
      .from("terms_conditions")
      .select("*")
      .order("created_at", { ascending: false });

    setTermsList(data || []);
  };

  if (authorized === null) {
    return <div className="p-10 text-center">Checking access...</div>;
  }

  /* =====================================================
     ACTION HANDLERS (RECHECK PERMISSION EVERY TIME)
  ===================================================== */
  const resetForm = () => {
    setEditingTC(null);
    setTitle("");
    setVersion("");
    setContent("");
    setEffectiveFrom("");
    setIsActive(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!(await checkPermission("create"))) return;

    if (isActive) {
      await supabase
        .from("terms_conditions")
        .update({ is_active: false })
        .eq("is_active", true);
    }

    await supabase.from("terms_conditions").insert([
      { title, version, content, effective_from: new Date(effectiveFrom), is_active: isActive },
    ]);

    resetForm();
    fetchTerms();
  };

  const handleEdit = async (tc: TermsCondition) => {
    if (!(await checkPermission("edit"))) return;
    setEditingTC(tc);
    setTitle(tc.title);
    setVersion(tc.version);
    setContent(tc.content);
    setEffectiveFrom(tc.effective_from.slice(0, 10));
    setIsActive(tc.is_active);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTC) return;
    if (!(await checkPermission("edit"))) return;

    if (isActive) {
      await supabase
        .from("terms_conditions")
        .update({ is_active: false })
        .eq("is_active", true);
    }

    await supabase
      .from("terms_conditions")
      .update({
        title,
        version,
        content,
        effective_from: new Date(effectiveFrom),
        is_active: isActive,
      })
      .eq("tc_id", editingTC.tc_id);

    resetForm();
    fetchTerms();
  };

  const handleDelete = async (tc_id: number) => {
    if (!(await checkPermission("delete"))) return;
    if (!confirm("Are you sure?")) return;

    await supabase.from("terms_conditions").delete().eq("tc_id", tc_id);
    fetchTerms();
  };

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">
        {editingTC ? "Edit Terms & Conditions" : "Add Terms & Conditions"}
      </h2>

      {(permissions.create || permissions.edit) && (
        <form
          onSubmit={editingTC ? handleUpdate : handleAdd}
          className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6"
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required />
          <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="Version" required />
          <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />

          <div className="flex items-center gap-2 col-span-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <span>Active</span>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="col-span-6"
            required
          />

          <Button type="submit">{editingTC ? "Update" : "Add"}</Button>
          {editingTC && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </form>
      )}

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th>Title</th>
            <th>Version</th>
            <th>Effective</th>
            <th>Active</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {termsList.map((tc) => (
            <tr key={tc.tc_id}>
              <td>{tc.title}</td>
              <td>{tc.version}</td>
              <td>{new Date(tc.effective_from).toLocaleDateString()}</td>
              <td>{tc.is_active ? "Yes" : "No"}</td>
              <td className="space-x-2">
                {permissions.edit && (
                  <Button size="sm" onClick={() => handleEdit(tc)}>
                    Edit
                  </Button>
                )}
                {permissions.delete && (
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(tc.tc_id)}>
                    Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
