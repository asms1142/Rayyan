// pages/superadmin/terms-conditions.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function TermsConditionsManagement() {
  const [termsList, setTermsList] = useState<TermsCondition[]>([]);
  const [editingTC, setEditingTC] = useState<TermsCondition | null>(null);

  const [title, setTitle] = useState("");
  const [version, setVersion] = useState("");
  const [content, setContent] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    const { data, error } = await supabase
      .from("terms_conditions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setTermsList(data || []);
  };

  const resetForm = () => {
    setEditingTC(null);
    setTitle("");
    setVersion("");
    setContent("");
    setEffectiveFrom("");
    setIsActive(false);
  };

  // Ensure only one active T&C
  const handleSetActive = async (checked: boolean) => {
    setIsActive(checked);
  };

  // Add New Terms
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Deactivate existing active T&C if this one is active
      if (isActive) {
        await supabase.from("terms_conditions").update({ is_active: false }).eq("is_active", true);
      }

      const { error } = await supabase.from("terms_conditions").insert([
        {
          title,
          version,
          content,
          effective_from: new Date(effectiveFrom),
          is_active: isActive,
        },
      ]);

      if (error) throw error;

      alert("Terms & Conditions added successfully!");
      resetForm();
      fetchTerms();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Edit Terms
  const handleEdit = (tc: TermsCondition) => {
    setEditingTC(tc);
    setTitle(tc.title);
    setVersion(tc.version);
    setContent(tc.content);
    setEffectiveFrom(tc.effective_from.slice(0, 10));
    setIsActive(tc.is_active);
  };

  // Update Terms
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTC) return;

    try {
      // Deactivate other active T&C if this one is active
      if (isActive) {
        await supabase.from("terms_conditions").update({ is_active: false }).eq("is_active", true);
      }

      const { error } = await supabase
        .from("terms_conditions")
        .update({
          title,
          version,
          content,
          effective_from: new Date(effectiveFrom),
          is_active: isActive,
        })
        .eq("tc_id", editingTC.tc_id);

      if (error) throw error;

      alert("Terms updated successfully!");
      resetForm();
      fetchTerms();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Delete Terms (only if not assigned)
  const handleDelete = async (tc_id: number) => {
    const { data: checkOrg } = await supabase
      .from("org_tc_acceptance")
      .select("org_id")
      .eq("tc_id", tc_id)
      .limit(1);

    const { data: checkUser } = await supabase
      .from("user_tc_acceptance")
      .select("user_id")
      .eq("tc_id", tc_id)
      .limit(1);

    if ((checkOrg && checkOrg.length > 0) || (checkUser && checkUser.length > 0)) {
      alert("Cannot delete: This T&C is assigned to some organization or user.");
      return;
    }

    if (!confirm("Are you sure you want to delete this Terms & Conditions?")) return;

    const { error } = await supabase.from("terms_conditions").delete().eq("tc_id", tc_id);
    if (error) alert(error.message);
    else fetchTerms();
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">{editingTC ? "Edit Terms & Conditions" : "Add Terms & Conditions"}</h2>

      {/* Form */}
      <form onSubmit={editingTC ? handleUpdate : handleAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-6">
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="border p-2 rounded col-span-2" required />
        <Input placeholder="Version (e.g., v1.0)" value={version} onChange={(e) => setVersion(e.target.value)} className="border p-2 rounded" required />
        <Input type="date" placeholder="Effective From" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} className="border p-2 rounded" required />

        <div className="flex items-center space-x-2 col-span-2">
          <Switch checked={isActive} onCheckedChange={handleSetActive} />
          <span>Active</span>
        </div>

        <Textarea placeholder="Terms Content" value={content} onChange={(e) => setContent(e.target.value)} className="border p-2 rounded col-span-6" required />

        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700 col-span-1">{editingTC ? "Update Terms" : "Add Terms"}</Button>
        {editingTC && (
          <Button type="button" onClick={resetForm} className="bg-gray-500 text-white hover:bg-gray-600 col-span-1">
            Cancel
          </Button>
        )}
      </form>

      {/* Terms Table */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Title</th>
            <th className="border p-2">Version</th>
            <th className="border p-2">Effective From</th>
            <th className="border p-2">Active</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {termsList.map((tc) => (
            <tr key={tc.tc_id}>
              <td className="border p-2">{tc.title}</td>
              <td className="border p-2">{tc.version}</td>
              <td className="border p-2">{new Date(tc.effective_from).toLocaleDateString()}</td>
              <td className="border p-2">{tc.is_active ? "Yes" : "No"}</td>
              <td className="border p-2 space-x-2">
                <Button onClick={() => handleEdit(tc)} className="bg-yellow-500 text-white hover:bg-yellow-600 px-2 py-1 rounded">
                  Edit
                </Button>
                <Button onClick={() => handleDelete(tc.tc_id)} className="bg-red-600 text-white hover:bg-red-700 px-2 py-1 rounded">
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
