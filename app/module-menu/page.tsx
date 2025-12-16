'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';

interface Module {
  module_id: number;
  name: string;
}

interface ModuleMenu {
  id: number;
  module_id: number;
  menu_name: string;
  page_name: string;
  note: string | null;
  visibility: boolean;
  sort_index: number | null;
}

export default function ModuleMenuPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [menus, setMenus] = useState<ModuleMenu[]>([]);
  const [editingMenu, setEditingMenu] = useState<ModuleMenu | null>(null);
  const [form, setForm] = useState({
    module_id: 0,
    menu_name: '',
    page_name: '',
    note: '',
    visibility: true,
    sort_index: 1,
  });

  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('All');

  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  // Fetch modules
  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('module')
      .select('*')
      .order('sort_index', { ascending: true });
    if (error) return alert('Failed to fetch modules: ' + error.message);
    setModules(data || []);
  };

  // Fetch menus
  const fetchMenus = async () => {
    const { data, error } = await supabase
      .from('module_menu')
      .select('*')
      .order('module_id', { ascending: true })
      .order('sort_index', { ascending: true });
    if (error) return alert('Failed to fetch module menus: ' + error.message);
    setMenus(data || []);
  };

  useEffect(() => {
    fetchModules();
    fetchMenus();
  }, []);

  const getNextSortIndex = (module_id: number) => {
    const moduleMenus = menus.filter((m) => m.module_id === module_id);
    if (!moduleMenus.length) return 1;
    return Math.max(...moduleMenus.map((m) => m.sort_index || 0)) + 1;
  };

  const isSortIndexExist = (module_id: number, index: number) => {
    return menus.some(
      (m) =>
        m.module_id === module_id &&
        m.sort_index === index &&
        (!editingMenu || m.id !== editingMenu.id)
    );
  };

  const handleAdd = async () => {
    if (!form.menu_name.trim() || !form.page_name.trim() || !form.module_id)
      return alert('Module, Menu Name and Page Name are required');

    if (isSortIndexExist(form.module_id, form.sort_index)) {
      return alert('Sort Index already exists for this module. Choose a different value.');
    }

    const { error, data } = await supabase
      .from('module_menu')
      .insert([{ ...form, comp_id: 1, visibility: form.visibility }])
      .select();

    if (error) return alert('Failed to add menu: ' + error.message);

    if (data && tabulator.current) {
      tabulator.current.addData(data, true); // add to table without refetch
    }

    setForm({ module_id: 0, menu_name: '', page_name: '', note: '', visibility: true, sort_index: 1 });
  };

  const handleEdit = (menu: ModuleMenu) => {
    setEditingMenu(menu);
    setForm({
      module_id: menu.module_id,
      menu_name: menu.menu_name,
      page_name: menu.page_name,
      note: menu.note || '',
      visibility: menu.visibility,
      sort_index: menu.sort_index || getNextSortIndex(menu.module_id),
    });
  };

  const handleUpdate = async () => {
    if (!editingMenu) return;
    if (!form.menu_name.trim() || !form.page_name.trim() || !form.module_id)
      return alert('Module, Menu Name and Page Name are required');

    if (isSortIndexExist(form.module_id, form.sort_index)) {
      return alert('Sort Index already exists for this module. Choose a different value.');
    }

    const { error, data } = await supabase
      .from('module_menu')
      .update({ ...form, visibility: form.visibility })
      .eq('id', editingMenu.id)
      .select();

    if (error) return alert('Failed to update menu: ' + error.message);

    if (data && tabulator.current) {
      tabulator.current.updateData(data);
    }

    setEditingMenu(null);
    setForm({ module_id: 0, menu_name: '', page_name: '', note: '', visibility: true, sort_index: 1 });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this menu?')) return;

    const { error } = await supabase.from('module_menu').delete().eq('id', id);
    if (error) return alert('Failed to delete menu: ' + error.message);

    if (tabulator.current) {
      tabulator.current.deleteRow(id);
    }
  };

  // Initialize Tabulator once
  useEffect(() => {
    if (typeof window === 'undefined' || !tableRef.current) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      data: menus,
      reactiveData: true,
      pagination: 'local',
      paginationSize: 50,
      paginationSizeSelector: [50, 100, 200],
      columns: [
        { title: 'SL No', formatter: 'rownum', hozAlign: 'center', width: 80 },
        {
          title: 'Module',
          field: 'module_id',
          hozAlign: 'left',
          formatter: (cell) => modules.find((m) => m.module_id == cell.getValue())?.name || '-',
        },
        { title: 'Menu Name', field: 'menu_name', hozAlign: 'left' },
        { title: 'Page Name', field: 'page_name', hozAlign: 'left' },
        { title: 'Sort Index', field: 'sort_index', hozAlign: 'center' },
        {
          title: 'Visibility',
          field: 'visibility',
          hozAlign: 'center',
          formatter: (cell) => (cell.getValue() ? 'Yes' : 'No'),
        },
        { title: 'Note', field: 'note', hozAlign: 'left' },
        {
          title: 'Actions',
          hozAlign: 'center',
          formatter: () => `
            <div class="flex flex-wrap justify-center gap-2">
              <button class="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Edit</button>
              <button class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
            </div>
          `,
          cellClick: function (e, cell) {
            const data = cell.getRow().getData() as ModuleMenu;
            if ((e.target as HTMLElement).textContent === 'Edit') handleEdit(data);
            if ((e.target as HTMLElement).textContent === 'Delete') handleDelete(data.id);
          },
        },
      ],
    });
  }, [menus, modules]);

  // Update Tabulator filters on search/module change
  useEffect(() => {
    if (!tabulator.current) return;

    tabulator.current.clearFilter(true);

    if (search) {
      tabulator.current.addFilter('menu_name', 'like', search);
    }

    if (filterModule !== 'All') {
      tabulator.current.addFilter('module_id', '=', Number(filterModule));
    }
  }, [search, filterModule]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Module Menu Management</h1>

      {/* Add/Edit Form */}
      <div className="bg-white shadow rounded p-4 mb-6 flex flex-col md:flex-row md:items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Module</label>
          <select
            value={form.module_id}
            onChange={(e) =>
              setForm({
                ...form,
                module_id: Number(e.target.value),
                sort_index: getNextSortIndex(Number(e.target.value)),
              })
            }
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          >
            <option value={0}>Select Module</option>
            {modules.map((mod) => (
              <option key={mod.module_id} value={mod.module_id}>
                {mod.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Menu Name</label>
          <input
            type="text"
            value={form.menu_name}
            onChange={(e) => setForm({ ...form, menu_name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="Enter menu name"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Page Name</label>
          <input
            type="text"
            value={form.page_name}
            onChange={(e) => setForm({ ...form, page_name: e.target.value })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
            placeholder="Enter page name"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Sort Index</label>
          <input
            type="number"
            value={form.sort_index}
            onChange={(e) => setForm({ ...form, sort_index: Number(e.target.value) })}
            className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Visibility</label>
          <input
            type="checkbox"
            checked={form.visibility}
            onChange={(e) => setForm({ ...form, visibility: e.target.checked })}
            className="mt-2"
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
          {editingMenu ? (
            <>
              <button
                onClick={handleUpdate}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Update
              </button>
              <button
                onClick={() => {
                  setEditingMenu(null);
                  setForm({ module_id: 0, menu_name: '', page_name: '', note: '', visibility: true, sort_index: 1 });
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
              Add Menu
            </button>
          )}
        </div>
      </div>

      {/* Search & Module Filter */}
      <div className="mb-4 flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Search by menu name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/3 border border-gray-300 rounded p-2"
        />
        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="w-full md:w-1/4 border border-gray-300 rounded p-2"
        >
          <option value="All">All Modules</option>
          {modules.map((mod) => (
            <option key={mod.module_id} value={mod.module_id}>
              {mod.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabulator Table */}
      <div ref={tableRef}></div>
    </div>
  );
}
