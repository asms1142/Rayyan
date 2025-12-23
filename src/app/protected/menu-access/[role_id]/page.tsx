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
  id?: number;
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

  /* 🔥 FIX: FORCE BASE ROUTE FOR RELATIVE LINKS */
  useEffect(() => {
    const base = document.createElement('base');
    base.href = '/protected/';
    document.head.appendChild(base);

    return () => {
      document.head.removeChild(base);
    };
  }, []);

  if (!roleId || isNaN(roleId)) {
    return <div className="p-6 text-red-600">Invalid Role ID</div>;
  }

  /* ---------------- Fetch Base Data ---------------- */

  const fetchRole = async () => {
    const { data, error } = await supabase
      .from('userrole')
      .select('*')
      .eq('role_id', roleId)
      .single();

    if (error) {
      alert(error.message);
      return;
    }
    setRole(data);
  };

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('module')
      .select('*')
      .order('sort_index');

    if (error) {
      alert(error.message);
      return;
    }
    setModules(data || []);
  };

  /* --------- Load Menu Access --------- */

  const loadModuleMenuAccess = async (module_id: number) => {
    setLoading(true);

    const [{ data: menus }, { data: accessData }] = await Promise.all([
      supabase
        .from('module_menu')
        .select('*')
        .eq('module_id', module_id)
        .order('sort_index'),

      supabase
        .from('menu_access')
        .select('*')
        .eq('role_id', roleId)
        .eq('module_id', module_id),
    ]);

    setModuleMenus(menus || []);

    const accessMap = new Map<number, MenuAccess>();
    (accessData || []).forEach((a) => {
      accessMap.set(a.menu_id, a);
    });

    const finalAccess: MenuAccess[] = (menus || []).map((menu) => {
      const existing = accessMap.get(menu.id);

      return (
        existing || {
          menu_id: menu.id,
          module_id,
          role_id: roleId,
          view: false,
          create: false,
          edit: false,
          delete: false,
          pdf: false,
          export: false,
        }
      );
    });

    setMenuAccess(finalAccess);
    setLoading(false);
  };

  /* ---------------- Effects ---------------- */

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
    if (selectedModuleId) {
      loadModuleMenuAccess(selectedModuleId);
    }
  }, [selectedModuleId]);

  /* ---------------- Handlers ---------------- */

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
    if (!selectedModuleId) return;

    const updates = menuAccess.filter((m) => m.id);
    const inserts = menuAccess.filter((m) => !m.id);

    for (const row of updates) {
      await supabase
        .from('menu_access')
        .update({
          view: row.view,
          create: row.create,
          edit: row.edit,
          delete: row.delete,
          pdf: row.pdf,
          export: row.export,
        })
        .eq('id', row.id);
    }

    if (inserts.length) {
      await supabase.from('menu_access').insert(inserts);
    }

    alert('Menu access saved successfully');
    loadModuleMenuAccess(selectedModuleId);
  };

  if (loading) return <div className="p-6">Loading...</div>;

  /* ---------------- UI ---------------- */

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Menu Access Management: {role?.rolename}
      </h1>

      <div className="mb-6">
        <label className="block mb-1 font-medium">Select Module</label>
        <select
          className="border rounded p-2"
          value={selectedModuleId || ''}
          onChange={(e) => setSelectedModuleId(Number(e.target.value))}
        >
          <option value="">Select Module</option>
          {modules.map((m) => (
            <option key={m.module_id} value={m.module_id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {selectedModuleId && (
        <>
          <table className="min-w-full border">
            <thead className="bg-gray-200">
              <tr>
                <th className="border px-2 py-1">Menu</th>
                {(['view', 'create', 'edit', 'delete', 'pdf', 'export'] as const).map(
                  (field) => (
                    <th key={field} className="border text-center px-2 py-1">
                      {field}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {moduleMenus.map((menu) => {
                const access = menuAccess.find((m) => m.menu_id === menu.id)!;
                return (
                  <tr key={menu.id}>
                    <td className="border px-2 py-1">{menu.menu_name}</td>
                    {(['view', 'create', 'edit', 'delete', 'pdf', 'export'] as const).map(
                      (field) => (
                        <td key={field} className="border text-center">
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

          <button
            onClick={saveMenuAccess}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save Menu Access
          </button>
        </>
      )}
    </div>
  );
}
