'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

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
  // RBAC & permissions
  const { permissions, authorized, loading } = usePermission('module-menu');

  // State hooks
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

  // Tabulator refs
  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  // Fetch modules
  const fetchModules = async () => {
    const { data, error } = await supabase.from('module').select('*').order('sort_index', { ascending: true });
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
    if (authorized) {
      fetchModules();
      fetchMenus();
    }
  }, [authorized]);

  // Helpers
  const getNextSortIndex = (module_id: number) => {
    const moduleMenus = menus.filter((m) => m.module_id === module_id);
    if (!moduleMenus.length) return 1;
    return Math.max(...moduleMenus.map((m) => m.sort_index || 0)) + 1;
  };

  const isSortIndexExist = (module_id: number, index: number) =>
    menus.some((m) => m.module_id === module_id && m.sort_index === index && (!editingMenu || m.id !== editingMenu.id));

  // CRUD operations
  const handleAdd = async () => {
    if (!permissions.create) return alert('You do not have permission to create.');
    if (!form.menu_name.trim() || !form.page_name.trim() || !form.module_id)
      return alert('Module, Menu Name and Page Name are required');
    if (isSortIndexExist(form.module_id, form.sort_index)) return alert('Sort Index already exists.');

    const { error, data } = await supabase
      .from('module_menu')
      .insert([{ ...form, comp_id: 1, visibility: form.visibility }])
      .select();
    if (error) return alert('Failed to add menu: ' + error.message);

    if (data && tabulator.current) tabulator.current.addData(data, true);
    setForm({ module_id: 0, menu_name: '', page_name: '', note: '', visibility: true, sort_index: 1 });
  };

  const handleEdit = (menu: ModuleMenu) => {
    if (!permissions.edit) return;
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
    if (!editingMenu || !permissions.edit) return;
    if (!form.menu_name.trim() || !form.page_name.trim() || !form.module_id)
      return alert('Module, Menu Name and Page Name are required');
    if (isSortIndexExist(form.module_id, form.sort_index)) return alert('Sort Index already exists.');

    const { error, data } = await supabase
      .from('module_menu')
      .update({ ...form, visibility: form.visibility })
      .eq('id', editingMenu.id)
      .select();
    if (error) return alert('Failed to update menu: ' + error.message);

    if (data && tabulator.current) tabulator.current.updateData(data);
    setEditingMenu(null);
    setForm({ module_id: 0, menu_name: '', page_name: '', note: '', visibility: true, sort_index: 1 });
  };

  const handleDelete = async (id: number) => {
    if (!permissions.delete) return alert('You do not have permission to delete.');
    if (!confirm('Are you sure you want to delete this menu?')) return;

    const { error } = await supabase.from('module_menu').delete().eq('id', id);
    if (error) return alert('Failed to delete menu: ' + error.message);

    if (tabulator.current) tabulator.current.deleteRow(id);
  };

  // Tabulator init
  useEffect(() => {
    if (typeof window === 'undefined' || !tableRef.current) return;

    tabulator.current?.destroy();
    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      data: menus,
      reactiveData: true,
      pagination: true,
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

  // Filters
  useEffect(() => {
    if (!tabulator.current) return;
    tabulator.current.clearFilter(true);
    if (search) tabulator.current.addFilter('menu_name', 'like', search);
    if (filterModule !== 'All') tabulator.current.addFilter('module_id', '=', Number(filterModule));
  }, [search, filterModule]);

  // Render
  return (
    <PageWrapper title="Module Menu Management">
      {loading && <Loader message="Checking access..." />}
      {!loading && !authorized && <div className="p-10 text-center text-red-500">Unauthorized</div>}

      {!loading && authorized && (
        <>
          {/* Form */}
          {(permissions.create || (permissions.edit && editingMenu)) && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 bg-white p-4 rounded shadow">
              <FormSelect
                label="Module"
                options={[{ value: 0, label: 'Select Module' }, ...modules.map((m) => ({ value: m.module_id, label: m.name }))]}
                value={form.module_id}
                onChange={(e) =>
                  setForm({
                    ...form,
                    module_id: Number(e.target.value),
                    sort_index: getNextSortIndex(Number(e.target.value)),
                  })
                }
              />
              <FormInput label="Menu Name" value={form.menu_name} onChange={(e) => setForm({ ...form, menu_name: e.target.value })} />
              <FormInput label="Page Name" value={form.page_name} onChange={(e) => setForm({ ...form, page_name: e.target.value })} />
              <FormInput label="Sort Index" type="number" value={form.sort_index} onChange={(e) => setForm({ ...form, sort_index: Number(e.target.value) })} />
              <div className="flex items-center gap-2 mt-6 md:mt-0">
                <input type="checkbox" checked={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.checked })} />
                <span>Visibility</span>
              </div>
              <FormInput label="Note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              <div className="flex items-end gap-2 md:col-span-6">
                {editingMenu ? (
                  <>
                    <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Update</button>
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
                  <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Add Menu</button>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4 items-center">
            <FormInput placeholder="Search by menu name..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <FormSelect
              options={[{ value: 'All', label: 'All Modules' }, ...modules.map((m) => ({ value: m.module_id, label: m.name }))]}
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded shadow p-2">
            <div ref={tableRef}></div>
          </div>
        </>
      )}
    </PageWrapper>
  );
}
