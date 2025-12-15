'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface Module {
  module_id: number;
  name: string;
  type: string;
  sort_index: number;
  comp_id: number;
  note: string | null;
}

export default function ModuleManager() {
  const [modules, setModules] = useState<Module[]>([]);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [form, setForm] = useState({ name: '', type: 'Platform', sort_index: 1, note: '' });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Fetch all modules
  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('module')
      .select('*')
      .order('sort_index', { ascending: true });

    if (error) return alert('Failed to fetch modules: ' + error.message);
    setModules(data || []);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  // Auto-increment sort index
  const getNextSortIndex = () => {
    if (!modules.length) return 1;
    const maxIndex = Math.max(...modules.map((m) => m.sort_index));
    return maxIndex + 1;
  };

  // Check if sort_index exists
  const isSortIndexExist = (index: number) => {
    return modules.some((m) => m.sort_index === index && (!editingModule || m.module_id !== editingModule.module_id));
  };

  // Add new module
  const handleAdd = async () => {
    if (!form.name.trim()) return alert('Module name is required');

    if (isSortIndexExist(form.sort_index)) {
      return alert('Sort Index already exists. Please choose a different value.');
    }

    const { error } = await supabase
      .from('module')
      .insert([{ ...form, comp_id: 1 }]);

    if (error) return alert('Failed to add module: ' + error.message);

    setForm({ name: '', type: 'Platform', sort_index: getNextSortIndex(), note: '' });
    fetchModules();
  };

  // Edit module
  const handleEdit = (mod: Module) => {
    setEditingModule(mod);
    setForm({
      name: mod.name,
      type: mod.type,
      sort_index: mod.sort_index,
      note: mod.note || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingModule) return;
    if (!form.name.trim()) return alert('Module name is required');

    if (isSortIndexExist(form.sort_index)) {
      return alert('Sort Index already exists. Please choose a different value.');
    }

    const { error } = await supabase
      .from('module')
      .update({ ...form })
      .eq('module_id', editingModule.module_id);

    if (error) return alert('Failed to update module: ' + error.message);

    setEditingModule(null);
    setForm({ name: '', type: 'Platform', sort_index: getNextSortIndex(), note: '' });
    fetchModules();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this module?')) return;

    const { error } = await supabase.from('module').delete().eq('module_id', id);
    if (error) return alert('Failed to delete module: ' + error.message);

    fetchModules();
  };

  // Filter modules by search and type
  const filteredModules = modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) &&
    (filterType === 'All' || m.type === filterType)
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Module Management</h1>

      {/* Add / Edit Form */}
      <div className="bg-white shadow rounded p-4 mb-6 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Module Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="Enter module name"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Module Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          >
            <option value="Platform">Platform</option>
            <option value="Organization">Organization</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Sort Index</label>
          <input
            type="number"
            value={form.sort_index}
            onChange={(e) => setForm({ ...form, sort_index: Number(e.target.value) })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="Auto or enter value"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Note</label>
          <input
            type="text"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="Optional note"
          />
        </div>

        <div className="flex gap-2">
          {editingModule ? (
            <>
              <button
                onClick={handleUpdate}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
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
            <button
              onClick={handleAdd}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Add Module
            </button>
          )}
        </div>
      </div>

      {/* Search + Type Filter */}
      <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Search by module name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/3 border border-gray-300 rounded p-2"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="w-full md:w-1/4 border border-gray-300 rounded p-2"
        >
          <option value="All">All Types</option>
          <option value="Platform">Platform</option>
          <option value="Organization">Organization</option>
        </select>
      </div>

      {/* Module List Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white shadow rounded">
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
    </div>
  );
}
