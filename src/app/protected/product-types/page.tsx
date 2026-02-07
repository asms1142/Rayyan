'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

interface ProductType {
  product_type_id: number;
  product_type_name: string;
  description: string;
  is_active: boolean;
}

export default function ProductTypesPage() {
  const { permissions, authorized, loading } = usePermission('product-types');

  const [data, setData] = useState<ProductType[]>([]);
  const [editing, setEditing] = useState<ProductType | null>(null);
  const [form, setForm] = useState({
    product_type_name: '',
    description: '',
    is_active: true,
  });
  const [search, setSearch] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  /* ---------------- FETCH DATA ---------------- */
  const fetchProductTypes = async () => {
    const { data, error } = await supabase.from('product_types').select('*').order('product_type_name');
    if (error) return alert('Failed to fetch product types: ' + error.message);
    setData(data || []);
  };

  useEffect(() => {
    if (authorized) fetchProductTypes();
  }, [authorized]);

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
        { title: 'Product Type', field: 'product_type_name', hozAlign: 'left' },
        { title: 'Description', field: 'description', hozAlign: 'left' },
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
            const rowData = cell.getRow().getData() as ProductType;

            // Always check live permissions before attaching handlers
            const livePermissions = permissions;

            // Edit button
            const editBtn = document.createElement('button');
            editBtn.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600';
            editBtn.textContent = 'Edit';
            editBtn.onclick = () => {
              if (!livePermissions.edit) return alert('You no longer have permission to edit this record.');
              handleEdit(rowData);
            };
            if (livePermissions.edit) container.appendChild(editBtn);

            // Delete button
            const delBtn = document.createElement('button');
            delBtn.className = 'bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600';
            delBtn.textContent = 'Delete';
            delBtn.onclick = () => {
              if (!livePermissions.delete) return alert('You no longer have permission to delete this record.');
              handleDelete(rowData.product_type_id);
            };
            if (livePermissions.delete) container.appendChild(delBtn);

            return container;
          },
        },
      ],
    });
  }, [data, permissions, authorized]);

  /* ---------------- SEARCH ---------------- */
  useEffect(() => {
    if (!tabulator.current) return;
    tabulator.current.clearFilter(true);
    if (search) tabulator.current.addFilter('product_type_name', 'like', search);
  }, [search]);

  /* ---------------- CRUD ---------------- */
  const handleAdd = async () => {
    if (!permissions.create) return alert('You do not have permission to create.');
    if (!form.product_type_name) return alert('Product Type Name is required');

    const { data: inserted, error } = await supabase.from('product_types').insert([{ ...form }]).select();
    if (error) return alert(error.message);

    if (inserted && tabulator.current) tabulator.current.addData(inserted, true);
    resetForm();
  };

  const handleEdit = (row: ProductType) => {
    if (!permissions.edit) return alert('You do not have permission to edit.');
    setEditing(row);
    setForm({
      product_type_name: row.product_type_name,
      description: row.description || '',
      is_active: row.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editing) return alert('No record selected for update.');
    if (!permissions.edit) return alert('You no longer have permission to update this record.');

    const { data: updated, error } = await supabase
      .from('product_types')
      .update({ ...form })
      .eq('product_type_id', editing.product_type_id)
      .select();

    if (error) return alert(error.message);

    if (updated && tabulator.current) {
      const row = tabulator.current.getRow(editing.product_type_id);
      if (row) row.update(updated[0]);
    }
    resetForm();
  };

  const handleDelete = async (id: number) => {
    if (!permissions.delete) return alert('You no longer have permission to delete this record.');
    if (!confirm('Are you sure to delete this Product Type?')) return;

    const { error } = await supabase.from('product_types').delete().eq('product_type_id', id);
    if (error) return alert(error.message);

    if (tabulator.current) {
      const row = tabulator.current.getRow(id);
      if (row) row.delete();
    }
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      product_type_name: '',
      description: '',
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
    <PageWrapper title="Product Types">
      {/* Form */}
      {(permissions.create || (permissions.edit && editing)) && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 bg-white p-4 rounded shadow">
          <FormInput
            label="Product Type Name"
            value={form.product_type_name}
            onChange={(e) => setForm({ ...form, product_type_name: e.target.value })}
          />
          <FormInput
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="flex items-center gap-2 mt-6 md:mt-0">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
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
                  Add Product Type
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <FormInput placeholder="Search Product Type..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow p-2">
        <div ref={tableRef}></div>
      </div>
    </PageWrapper>
  );
}
