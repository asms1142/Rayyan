'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { usePermission } from "@/hooks/usePermission";
import PageWrapper from "@/components/ui/PageWrapper";
import FormInput from "@/components/ui/FormInput";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader } from "@/components/ui/Loader";

interface TermsCondition {
  tc_id: number;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  effective_from: string;
  created_at: string;
}

export default function TermsConditionsManagement() {
  const { permissions, authorized, loading } = usePermission("terms-conditions");

  const [termsList, setTermsList] = useState<TermsCondition[]>([]);
  const [editingTC, setEditingTC] = useState<TermsCondition | null>(null);

  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [content, setContent] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [isActive, setIsActive] = useState(false);

  // Fetch terms
  const fetchTerms = async () => {
    const { data } = await supabase
      .from("terms_conditions")
      .select("*")
      .order("created_at", { ascending: false });
    setTermsList(data || []);
  };

  useEffect(() => {
    if (authorized) fetchTerms();
  }, [authorized]);

  if (loading) return <Loader message="Checking access..." />;
  if (!authorized) return <div className="p-10 text-center text-red-500">Unauthorized</div>;

  const resetForm = () => {
    setEditingTC(null);
    setTitle("");
    setVersion("");
    setContent("");
    setEffectiveFrom("");
    setIsActive(false);
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTC && permissions.edit) {
      if (isActive) {
        await supabase.from("terms_conditions").update({ is_active: false }).eq("is_active", true);
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
    } else if (!editingTC && permissions.create) {
      if (isActive) {
        await supabase.from("terms_conditions").update({ is_active: false }).eq("is_active", true);
      }
      await supabase
        .from("terms_conditions")
        .insert([{ title, version, content, effective_from: new Date(effectiveFrom), is_active: isActive }]);
    }

    resetForm();
    fetchTerms();
  };

  const handleEdit = (tc: TermsCondition) => {
    if (!permissions.edit) return;
    setEditingTC(tc);
    setTitle(tc.title);
    setVersion(tc.version);
    setContent(tc.content);
    setEffectiveFrom(tc.effective_from.slice(0, 10));
    setIsActive(tc.is_active);
  };

  const handleDelete = async (tc_id: number) => {
    if (!permissions.delete) return;
    if (!confirm("Are you sure you want to delete this T&C?")) return;
    await supabase.from("terms_conditions").delete().eq("tc_id", tc_id);
    fetchTerms();
  };

  return (
    <PageWrapper title="Terms & Conditions Management">
      {/* Form */}
      {(permissions.create || (permissions.edit && editingTC)) && (
        <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 bg-white p-4 rounded shadow">
          <FormInput label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required className="col-span-2" />
          <FormInput label="Version" value={version} onChange={(e) => setVersion(e.target.value)} required className="col-span-1" />
          <FormInput label="Effective From" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required className="col-span-1" />

          <div className="flex items-center gap-2 col-span-1">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <span className="text-sm">Active</span>
          </div>

          <Textarea value={content} onChange={(e) => setContent(e.target.value)} className="col-span-6" placeholder="Enter content" required />

          {/* Buttons */}
          <div className="flex gap-3 col-span-6">
            {(!editingTC && permissions.create) && (
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Add
              </button>
            )}
            {editingTC && permissions.edit && (
              <>
                <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Update
                </button>
                <button type="button" onClick={resetForm} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                  Cancel
                </button>
              </>
            )}
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr className="text-left">
              <th className="px-3 py-2 border-b">Title</th>
              <th className="px-3 py-2 border-b">Version</th>
              <th className="px-3 py-2 border-b">Effective</th>
              <th className="px-3 py-2 border-b">Active</th>
              {(permissions.edit || permissions.delete) && <th className="px-3 py-2 border-b">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {termsList.map((tc) => (
              <tr key={tc.tc_id} className="hover:bg-gray-50">
                <td className="px-3 py-2 border-b">{tc.title}</td>
                <td className="px-3 py-2 border-b">{tc.version}</td>
                <td className="px-3 py-2 border-b">{new Date(tc.effective_from).toLocaleDateString()}</td>
                <td className="px-3 py-2 border-b">{tc.is_active ? "Yes" : "No"}</td>
                {(permissions.edit || permissions.delete) && (
                  <td className="px-3 py-2 border-b flex gap-2">
                    {permissions.edit && (
                      <button onClick={() => handleEdit(tc)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">
                        Edit
                      </button>
                    )}
                    {permissions.delete && (
                      <button onClick={() => handleDelete(tc.tc_id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                        Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}
