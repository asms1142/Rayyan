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

interface UomCategory {
  uom_category_id: number;
  category_name: string;
}

interface UOM {
  uom_id: number;
  uom_name: string;
  uom_code: string;
  uom_category_id: number;
  uom_type: string;
  factor: number;
  rounding: number;
  is_active: boolean;
  uom_category?: UomCategory;
}

export default function UOMPage() {
  const { permissions, authorized, loading } = usePermission('uom');

  const [categories, setCategories] = useState<UomCategory[]>([]);
  const [data, setData] = useState<UOM[]>([]);
  const [editing, setEditing] = useState<UOM | null>(null);
  const [form, setForm] = useState({
    uom_name: '',
    uom_code: '',
    uom_category_id: 0,
    uom_type: 'reference',
    factor: 1,
    rounding: 0.01,
    is_active: true,
  });
  const [search, setSearch] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  /* ---------------- FETCH DATA ---------------- */
  const fetchCategories = async () => {
    const { data, error } = await supabase.from('uom_categories').select('*').order('category_name');
    if (error) return alert('Failed to fetch categories: ' + error.message);
    setCategories(data || []);
  };

  const fetchUOMs = async () => {
    const { data, error } = await supabase
      .from('uom')
      .select('*, uom_category:uom_category_id(category_name)')
      .order('uom_name');
    if (error) return alert('Failed to fetch UOMs: ' + error.message);
    setData(data || []);
  };

  useEffect(() => {
    if (authorized) {
      fetchCategories();
      fetchUOMs();
    }
  }, [authorized]);

  /* ---------------- LIVE RBAC CHECK ---------------- */
  const checkRBAC = async (operation: 'create' | 'edit' | 'delete') => {
    try {
      const { data, error } = await supabase
        .from('menu_access')
        .select(operation)
        .eq('role_id', permissions.roleId)
        .eq('menu_name', 'uom')
        .single();
      if (error || !data) return false;
      return !!data[operation];
    } catch {
      return false;
    }
  };

  /* ---------------- TABULATOR ---------------- */
  useEffect(() => {
    if (!tableRef.current || !authorized) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      data,
      reactiveData: true,
      pagination: true,
      paginationSize: 50,
      columns: [
        { title: 'SL', formatter: 'rownum', hozAlign: 'center', width: 80 },
        { title: 'UOM Name', field: 'uom_name', hozAlign: 'left' },
        { title: 'UOM Code', field: 'uom_code', hozAlign: 'left' },
        {
          title: 'Category',
          field: 'uom_category_id',
          hozAlign: 'left',
          formatter: (cell) => cell.getData().uom_category?.category_name || '-',
        },
        { title: 'Type', field: 'uom_type', hozAlign: 'center' },
        { title: 'Factor', field: 'factor', hozAlign: 'center' },
        { title: 'Rounding', field: 'rounding', hozAlign: 'center' },
        {
          title: 'Status',
          field: 'is_active',
          hozAlign: 'center',
          formatter: (cell) => (cell.getValue() ? 'Active' : 'Inactive'),
        },
        {
          title: 'Actions',
          hozAlign: 'center',
          formatter: (cell) => {
            const container = document.createElement('div');
            container.className = 'flex flex-wrap justify-center gap-2';
            const rowData = cell.getRow().getData() as UOM;

            // Edit button
            if (permissions.edit) {
              const editBtn = document.createElement('button');
              editBtn.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600';
              editBtn.textContent = 'Edit';
              editBtn.onclick = async () => {
                const canEdit = await checkRBAC('edit');
                if (!canEdit) return alert('You no longer have permission to edit this record.');
                handleEdit(rowData);
              };
              container.appendChild(editBtn);
            }

            // Delete button
            if (permissions.delete) {
              const delBtn = document.createElement('button');
              delBtn.className = 'bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600';
              delBtn.textContent = 'Delete';
              delBtn.onclick = async () => {
                const canDelete = await checkRBAC('delete');
                if (!canDelete) return alert('You no longer have permission to delete this record.');
                handleDelete(rowData.uom_id);
              };
              container.appendChild(delBtn);
            }

            return container;
          },
        },
      ],
    });
  }, [data, categories, permissions, authorized]);

  /* ---------------- SEARCH ---------------- */
  useEffect(() => {
    if (!tabulator.current) return;
    tabulator.current.clearFilter(true);
    if (search) tabulator.current.addFilter('uom_name', 'like', search);
  }, [search]);

  /* ---------------- CRUD ---------------- */
  const handleAdd = async () => {
    const canCreate = await checkRBAC('create');
    if (!canCreate) return alert('You no longer have permission to create.');
    if (!form.uom_name || !form.uom_code || !form.uom_category_id)
      return alert('Name, Code, and Category are required');

    const { data: inserted, error } = await supabase.from('uom').insert([{ ...form }]).select();
    if (error) return alert(error.message);

    if (inserted && tabulator.current) tabulator.current.addData(inserted, true);
    resetForm();
  };

  const handleEdit = (row: UOM) => {
    setEditing(row);
    setForm({
      uom_name: row.uom_name,
      uom_code: row.uom_code,
      uom_category_id: row.uom_category_id,
      uom_type: row.uom_type,
      factor: row.factor,
      rounding: row.rounding,
      is_active: row.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editing) return alert('No record selected for update.');
    const canEdit = await checkRBAC('edit');
    if (!canEdit) return alert('You no longer have permission to update this record.');

    const { data: updated, error } = await supabase.from('uom').update({ ...form }).eq('uom_id', editing.uom_id).select();
    if (error) return alert(error.message);

    if (updated && tabulator.current) {
      // Safely update only existing rows
      const row = tabulator.current.getRow(editing.uom_id);
      if (row) row.update(updated[0]);
    }
    resetForm();
  };

  const handleDelete = async (id: number) => {
    const canDelete = await checkRBAC('delete');
    if (!canDelete) return alert('You no longer have permission to delete this record.');
    if (!confirm('Are you sure to delete this UOM?')) return;

    const { error } = await supabase.from('uom').delete().eq('uom_id', id);
    if (error) return alert(error.message);

    if (tabulator.current) {
      const row = tabulator.current.getRow(id);
      if (row) row.delete();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      uom_name: '',
      uom_code: '',
      uom_category_id: 0,
      uom_type: 'reference',
      factor: 1,
      rounding: 0.01,
      is_active: true,
    });
  };

  /* ---------------- RENDER ---------------- */
  if (loading) return <Loader message="Checking access..." />;
  if (!authorized)
    return (
      <PageWrapper title="Unauthorized">
        <div className="p-10 text-center text-red-500">Unauthorized</div>
      </PageWrapper>
    );

  return (
    <PageWrapper title="Unit of Measure">
      {/* Form */}
      {(permissions.create || (permissions.edit && editing)) && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 bg-white p-4 rounded shadow">
          <FormInput label="UOM Name" value={form.uom_name} onChange={(e) => setForm({ ...form, uom_name: e.target.value })} />
          <FormInput label="UOM Code" value={form.uom_code} onChange={(e) => setForm({ ...form, uom_code: e.target.value })} />
          <FormSelect
            label="Category"
            options={[{ value: 0, label: 'Select Category' }, ...categories.map((c) => ({ value: c.uom_category_id, label: c.category_name }))]}
            value={form.uom_category_id}
            onChange={(e) => setForm({ ...form, uom_category_id: Number(e.target.value) })}
          />
          <FormSelect
            label="Type"
            options={[
              { value: 'reference', label: 'Reference' },
              { value: 'bigger', label: 'Bigger' },
              { value: 'smaller', label: 'Smaller' },
            ]}
            value={form.uom_type}
            onChange={(e) => setForm({ ...form, uom_type: e.target.value })}
          />
          <FormInput label="Factor" type="number" value={form.factor} onChange={(e) => setForm({ ...form, factor: Number(e.target.value) })} />
          <FormInput label="Rounding" type="number" value={form.rounding} onChange={(e) => setForm({ ...form, rounding: Number(e.target.value) })} />
          <div className="flex items-center gap-2 mt-6 md:mt-0">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            <span>Active</span>
          </div>
          <div className="flex items-end gap-2 md:col-span-6">
            {editing ? (
              <>
                <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                  Update
                </button>
                <button onClick={resetForm} className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400">
                  Cancel
                </button>
              </>
            ) : (
              permissions.create && (
                <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                  Add UOM
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <FormInput placeholder="Search UOM..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow p-2">
        <div ref={tableRef}></div>
      </div>
    </PageWrapper>
  );
}
