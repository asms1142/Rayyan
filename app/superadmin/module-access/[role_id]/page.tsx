'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Module {
  module_id: number;
  name: string;
}

interface ModuleAccess {
  id: number;
  module_id: number;
  role_id: number;
  comp_id: number;
}

interface Role {
  role_id: number;
  rolename: string;
}

export default function ModuleAccessPage() {
  const params = useParams();
  const role_id = Number(params.role_id);
  const router = useRouter();

  const [role, setRole] = useState<Role | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch role info
  const fetchRole = async () => {
    const { data, error } = await supabase.from('userrole').select('*').eq('role_id', role_id).single();
    if (error) return alert('Failed to fetch role: ' + error.message);
    setRole(data);
  };

  // Fetch modules
  const fetchModules = async () => {
    const { data, error } = await supabase.from('module').select('*').order('sort_index', { ascending: true });
    if (error) return alert('Failed to fetch modules: ' + error.message);
    setModules(data || []);
  };

  // Fetch assigned modules
  const fetchAssignedModules = async () => {
    const { data, error } = await supabase
      .from('module_access')
      .select('*')
      .eq('role_id', role_id);
    if (error) return alert('Failed to fetch module access: ' + error.message);
    setSelectedModules(data?.map((d) => d.module_id) || []);
  };

  useEffect(() => {
    fetchRole();
    fetchModules();
    fetchAssignedModules().finally(() => setLoading(false));
  }, []);

  const toggleModule = (module_id: number) => {
    if (selectedModules.includes(module_id)) {
      setSelectedModules(selectedModules.filter((id) => id !== module_id));
    } else {
      setSelectedModules([...selectedModules, module_id]);
    }
  };

  const handleSave = async () => {
    if (!role) return;
    setLoading(true);

    // Remove all existing module access for this role first
    const { error: delError } = await supabase.from('module_access').delete().eq('role_id', role.role_id);
    if (delError) {
      setLoading(false);
      return alert('Failed to clear previous module access: ' + delError.message);
    }

    // Insert selected modules
    const insertData = selectedModules.map((module_id) => ({
      module_id,
      role_id: role.role_id,
      comp_id: 1, // default comp_id
    }));

    if (insertData.length > 0) {
      const { error: insertError } = await supabase.from('module_access').insert(insertData);
      if (insertError) {
        setLoading(false);
        return alert('Failed to save module access: ' + insertError.message);
      }
    }

    setLoading(false);
    alert('Module access saved successfully!');
    router.back();
  };

  if (loading) return <div className="p-6 text-center">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Module Access for Role: {role?.rolename}</h1>

      <div className="bg-white shadow rounded p-4 mb-6">
        <h2 className="text-lg font-medium mb-3">Select Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <label key={mod.module_id} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedModules.includes(mod.module_id)}
                onChange={() => toggleModule(mod.module_id)}
                className="w-4 h-4"
              />
              <span>{mod.name}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Save Module Access
          </button>
          <button
            onClick={() => router.back()}
            className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
