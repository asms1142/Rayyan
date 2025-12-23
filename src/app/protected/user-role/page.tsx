'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import { useRouter } from 'next/navigation';

interface UserRole {
  role_id: number;
  created_at: string;
  rolename: string;
  comp_id: number;
  role_type: string | null;
  default_land_page: string | null;
}

export default function UserRolePage() {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [form, setForm] = useState({
    rolename: '',
    role_type: 'Platform',
    default_land_page: '',
  });
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();
  const router = useRouter();

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('userrole')
      .select('*')
      .order('role_id', { ascending: true });
    if (error) return alert('Failed to fetch roles: ' + error.message);
    setRoles(data || []);
  };

  const handleAdd = async () => {
    if (!form.rolename.trim()) return alert('Role name is required');
    const { error } = await supabase.from('userrole').insert([
      { ...form, comp_id: 1 },
    ]);
    if (error) return alert('Failed to add role: ' + error.message);
    setForm({ rolename: '', role_type: 'Platform', default_land_page: '' });
    fetchRoles();
  };

  const handleEdit = (role: UserRole) => {
    setEditingRole(role);
    setForm({
      rolename: role.rolename,
      role_type: role.role_type || 'Platform',
      default_land_page: role.default_land_page || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingRole) return;
    const { error } = await supabase
      .from('userrole')
      .update({ ...form })
      .eq('role_id', editingRole.role_id);
    if (error) return alert('Failed to update role: ' + error.message);
    setEditingRole(null);
    setForm({ rolename: '', role_type: 'Platform', default_land_page: '' });
    fetchRoles();
  };

  const handleDelete = async (role_id: number) => {
    if (!confirm('Are you sure to delete this role?')) return;
    const { error } = await supabase.from('userrole').delete().eq('role_id', role_id);
    if (error) return alert('Failed to delete role: ' + error.message);
    fetchRoles();
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !tableRef.current) return;
    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      data: roles,
      pagination: 'local',
      paginationSize: 100,
      paginationSizeSelector: [50, 100, 200],
      reactiveData: true,
      columns: [
        { title: 'SL No', formatter: 'rownum', hozAlign: 'center', width: 80 },
        { title: 'Role Name', field: 'rolename', hozAlign: 'left' },
        { title: 'Role Type', field: 'role_type', hozAlign: 'center' },
        { title: 'Default Landing Page', field: 'default_land_page', hozAlign: 'left' },
        {
          title: 'Created At',
          field: 'created_at',
          hozAlign: 'center',
          formatter: (cell) => new Date(cell.getValue()).toLocaleString(),
        },
        {
          title: 'Actions',
          hozAlign: 'center',
          formatter: function () {
            return `
              <div class="flex flex-wrap gap-1 justify-center items-center">
                <button class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-xs">Edit</button>
                <button class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs">Delete</button>
                <button class="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs">Module Access</button>
                <button class="bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 text-xs">Menu Access</button>
              </div>
            `;
          },
          cellClick: function (e, cell) {
            const data = cell.getRow().getData() as UserRole;
            const targetText = (e.target as HTMLElement).textContent;
            if (targetText === 'Edit') handleEdit(data);
            if (targetText === 'Delete') handleDelete(data.role_id);
            if (targetText === 'Module Access') router.push(`/protected/module-access/${data.role_id}`);
            if (targetText === 'Menu Access') router.push(`/protected/menu-access/${data.role_id}`);
          },
        },
      ],
    });
  }, [roles]);

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">User Role Management</h1>

      {/* Form */}
      <div className="bg-white shadow rounded p-4 mb-6 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Role Name</label>
          <input
            type="text"
            value={form.rolename}
            onChange={(e) => setForm({ ...form, rolename: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="Enter role name"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Role Type</label>
          <select
            value={form.role_type}
            onChange={(e) => setForm({ ...form, role_type: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          >
            <option value="Platform">Platform</option>
            <option value="Organization">Organization</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Default Landing Page</label>
          <input
            type="text"
            value={form.default_land_page}
            onChange={(e) => setForm({ ...form, default_land_page: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="Default landing page"
          />
        </div>

        <div className="flex gap-2">
          {editingRole ? (
            <>
              <button
                onClick={handleUpdate}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setEditingRole(null);
                  setForm({ rolename: '', role_type: 'Platform', default_land_page: '' });
                }}
                className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add Role
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div ref={tableRef}></div>
    </div>
  );
}
