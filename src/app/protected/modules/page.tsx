'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader } from "@/components/ui/Loader";
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import { usePermission } from '@/hooks/usePermission';

interface Module {
  module_id: number;
  name: string;
  type: string;
  sort_index: number;
  comp_id: number;
  note: string | null;
}

export default function ModuleManager() {
  // RBAC
  const { permissions, authorized, loading } = usePermission('modules');

  const [modules, setModules] = useState<Module[]>([]);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [form, setForm] = useState({ name: '', type: 'Platform', sort_index: 1, note: '' });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Fetch modules
  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('module')
      .select('*')
      .order('sort_index', { ascending: true });
    if (error) return alert('Failed to fetch modules: ' + error.message);
    setModules(data || []);
  };

  useEffect(() => {
    if (authorized) fetchModules();
  }, [authorized]);

  // Helpers
  const getNextSortIndex = () => (!modules.length ? 1 : Math.max(...modules.map((m) => m.sort_index)) + 1);

  const isSortIndexExist = (index: number) =>
    modules.some((m) => m.sort_index === index && (!editingModule || m.module_id !== editingModule.module_id));

  // CRUD
  const handleAdd = async () => {
    if (!permissions.create) return alert('You do not have permission to create.');
    if (!form.name.trim()) return alert('Module name is required');
    if (isSortIndexExist(form.sort_index)) return alert('Sort Index already exists.');

    const { error } = await supabase.from('module').insert([{ ...form, comp_id: 1 }]);
    if (error) return alert('Failed to add module: ' + error.message);

    setForm({ name: '', type: 'Platform', sort_index: getNextSortIndex(), note: '' });
    fetchModules();
  };

  const handleEdit = (mod: Module) => {
    if (!permissions.edit) return;
    setEditingModule(mod);
    setForm({
      name: mod.name,
      type: mod.type,
      sort_index: mod.sort_index,
      note: mod.note || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingModule || !permissions.edit) return;
    if (!form.name.trim()) return alert('Module name is required');
    if (isSortIndexExist(form.sort_index)) return alert('Sort Index already exists.');

    const { error } = await supabase.from('module').update({ ...form }).eq('module_id', editingModule.module_id);
    if (error) return alert('Failed to update module: ' + error.message);

    setEditingModule(null);
    setForm({ name: '', type: 'Platform', sort_index: getNextSortIndex(), note: '' });
    fetchModules();
  };

  const handleDelete = async (id: number) => {
    if (!permissions.delete) return alert('You do not have permission to delete.');
    if (!confirm('Are you sure you want to delete this module?')) return;

    const { error } = await supabase.from('module').delete().eq('module_id', id);
    if (error) return alert('Failed to delete module: ' + error.message);

    fetchModules();
  };

  const filteredModules = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) &&
      (filterType === 'All' || m.type === filterType)
  );

  return (
    <PageWrapper title="Module Management">
      {loading && <Loader message="Checking access..." />}
      {!loading && !authorized && <div className="p-10 text-center text-red-500">Unauthorized</div>}

      {!loading && authorized && (
        <>
          {/* Form */}
          {(permissions.create || (permissions.edit && editingModule)) && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 bg-white p-4 rounded shadow">
              <FormInput label="Module Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <FormSelect
                label="Module Type"
                options={[
                  { value: 'Platform', label: 'Platform' },
                  { value: 'Organization', label: 'Organization' },
                ]}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              />
              <FormInput
                label="Sort Index"
                type="number"
                value={form.sort_index}
                onChange={(e) => setForm({ ...form, sort_index: Number(e.target.value) })}
              />
              <FormInput label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <div className="flex items-end gap-2">
                {editingModule ? (
                  <>
                    <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                      Update
                    </button>
                    <button
                      onClick={() => {
                        setEditingModule(null);
                        setForm({ name: '', type: 'Platform', sort_index: getNextSortIndex(), note: '' });
                      }}
                      className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                    Add Module
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
            <FormInput placeholder="Search by module name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <FormSelect
              options={[
                { value: 'All', label: 'All Types' },
                { value: 'Platform', label: 'Platform' },
                { value: 'Organization', label: 'Organization' },
              ]}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white rounded shadow p-2">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Sort Index</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Note</th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredModules.map((mod) => (
                  <tr key={mod.module_id}>
                    <td className="px-4 py-2">{mod.module_id}</td>
                    <td className="px-4 py-2">{mod.name}</td>
                    <td className="px-4 py-2">{mod.type}</td>
                    <td className="px-4 py-2">{mod.sort_index}</td>
                    <td className="px-4 py-2">{mod.note || '-'}</td>
                    <td className="px-4 py-2 text-center flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(mod)}
                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(mod.module_id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredModules.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-2 text-center text-gray-500">
                      No modules found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageWrapper>
  );
}
