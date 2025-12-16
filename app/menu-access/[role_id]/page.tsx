'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Module {
  module_id: number;
  name: string;
}

interface ModuleMenu {
  id: number;
  module_id: number;
  menu_name: string;
}

interface Role {
  role_id: number;
  rolename: string;
}

interface MenuAccess {
  id?: number; // optional: undefined if not yet saved
  menu_id: number;
  module_id: number;
  role_id: number;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  pdf: boolean;
  export: boolean;
}

export default function MenuAccessPage() {
  const params = useParams();
  const roleId = Number(params.role_id);

  const [role, setRole] = useState<Role | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [moduleMenus, setModuleMenus] = useState<ModuleMenu[]>([]);
  const [menuAccess, setMenuAccess] = useState<MenuAccess[]>([]);
  const [loading, setLoading] = useState(true);

  if (!roleId || isNaN(roleId)) return <div>Invalid Role ID</div>;

  // Fetch role
  const fetchRole = async () => {
    const { data, error } = await supabase
      .from('userrole')
      .select('*')
      .eq('role_id', roleId)
      .single();
    if (error) return alert('Failed to fetch role: ' + error.message);
    setRole(data);
  };

  // Fetch modules
  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('module')
      .select('*')
      .order('sort_index', { ascending: true });
    if (error) return alert('Failed to fetch modules: ' + error.message);
    setModules(data || []);
  };

  // Fetch module menus for selected module
  const fetchModuleMenus = async (module_id: number) => {
    const { data, error } = await supabase
      .from('module_menu')
      .select('*')
      .eq('module_id', module_id)
      .order('sort_index', { ascending: true });
    if (error) return alert('Failed to fetch module menus: ' + error.message);
    setModuleMenus(data || []);

    // Initialize menuAccess state for new menus if they do not exist
    setMenuAccess((prev) => {
      const existingMenuIds = prev.map((m) => m.menu_id);
      const newMenuAccess = (data || [])
        .filter((menu) => !existingMenuIds.includes(menu.id))
        .map((menu) => ({
          menu_id: menu.id,
          module_id,
          role_id: roleId,
          view: false,
          create: false,
          edit: false,
          delete: false,
          pdf: false,
          export: false,
        }));
      return [...prev, ...newMenuAccess];
    });
  };

  // Fetch saved menu access for selected module and role
  const fetchMenuAccess = async (module_id: number) => {
    const { data, error } = await supabase
      .from('menu_access')
      .select('*')
      .eq('role_id', roleId)
      .eq('module_id', module_id);
    if (error) return alert('Failed to fetch menu access: ' + error.message);
    if (data) {
      setMenuAccess((prev) =>
        prev.map((m) => {
          const found = data.find((d) => d.menu_id === m.menu_id);
          return found ? { ...m, ...found } : m;
        })
      );
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchRole();
      await fetchModules();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedModuleId) return;
    fetchModuleMenus(selectedModuleId);
    fetchMenuAccess(selectedModuleId);
  }, [selectedModuleId]);

  const toggleMenuAccess = (menu_id: number, field: keyof MenuAccess) => {
    setMenuAccess((prev) =>
      prev.map((m) =>
        m.menu_id === menu_id ? { ...m, [field]: !m[field] } : m
      )
    );
  };

  const toggleAll = (field: keyof MenuAccess, checked: boolean) => {
    setMenuAccess((prev) =>
      prev.map((m) =>
        m.module_id === selectedModuleId ? { ...m, [field]: checked } : m
      )
    );
  };

  const saveMenuAccess = async () => {
    if (!selectedModuleId) return alert('Select a module first');

    const updates: MenuAccess[] = [];
    const inserts: MenuAccess[] = [];

    menuAccess
      .filter((m) => m.module_id === selectedModuleId)
      .forEach((m) => {
        if (m.id) {
          updates.push(m); // existing row -> update
        } else {
          inserts.push(m); // new row -> insert
        }
      });

    // Update existing rows
    for (const m of updates) {
      const { error } = await supabase
        .from('menu_access')
        .update({
          view: m.view,
          create: m.create,
          edit: m.edit,
          delete: m.delete,
          pdf: m.pdf,
          export: m.export,
        })
        .eq('id', m.id);
      if (error) return alert('Failed to update menu access: ' + error.message);
    }

    // Insert new rows
    if (inserts.length) {
      const { error } = await supabase.from('menu_access').insert(inserts);
      if (error) return alert('Failed to insert new menu access: ' + error.message);
    }

    alert('Menu access saved!');
    fetchMenuAccess(selectedModuleId); // reload to get IDs for future updates
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Menu Access Management: {role?.rolename}
      </h1>

      {/* Module selection */}
      <div className="mb-6">
        <label className="block mb-1 font-medium">Select Module</label>
        <select
          value={selectedModuleId || ''}
          onChange={(e) => setSelectedModuleId(Number(e.target.value))}
          className="border border-gray-300 rounded p-2"
        >
          <option value="">Select Module</option>
          {modules.map((mod) => (
            <option key={mod.module_id} value={mod.module_id}>
              {mod.name}
            </option>
          ))}
        </select>
      </div>

      {/* Module Menu Access */}
      {selectedModuleId && (
        <div>
          <h2 className="text-xl font-semibold mb-2">
            Module Menu Access: {modules.find((m) => m.module_id === selectedModuleId)?.name}
          </h2>
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-2 py-1">Menu Name</th>
                {(['view', 'create', 'edit', 'delete', 'pdf', 'export'] as (keyof MenuAccess)[]).map(
                  (field) => (
                    <th key={field} className="border px-2 py-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span>{field.charAt(0).toUpperCase() + field.slice(1)}</span>
                        <input
                          type="checkbox"
                          checked={
                            menuAccess
                              .filter((m) => m.module_id === selectedModuleId)
                              .every((m) => m[field])
                          }
                          onChange={(e) => toggleAll(field, e.target.checked)}
                        />
                      </div>
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {moduleMenus.map((menu) => {
                const access = menuAccess.find((m) => m.menu_id === menu.id)!;
                return (
                  <tr key={menu.id} className="border-b">
                    <td className="border px-2 py-1">{menu.menu_name}</td>
                    {(['view', 'create', 'edit', 'delete', 'pdf', 'export'] as (keyof MenuAccess)[]).map(
                      (field) => (
                        <td key={field} className="border px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={access[field]}
                            onChange={() => toggleMenuAccess(menu.id, field)}
                          />
                        </td>
                      )
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-2">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={saveMenuAccess}
            >
              Save Menu Access
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
