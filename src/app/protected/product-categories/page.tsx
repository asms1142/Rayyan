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

interface ProductCategory {
  category_id: number;
  category_name: string;
  parent_category_id: number | null;
  description: string;
  is_active: boolean;
  _children?: ProductCategory[]; // for tree structure
}

export default function ProductCategoriesPage() {
  const { permissions, authorized, loading } = usePermission('product-categories');

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form, setForm] = useState({
    category_name: '',
    parent_category_id: 0,
    description: '',
    is_active: true,
  });
  const [search, setSearch] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  /* ---------------- FETCH DATA ---------------- */
  const fetchCategories = async () => {
    const { data, error } = await supabase.from('product_categories').select('*').order('category_name');
    if (error) return alert('Failed to fetch categories: ' + error.message);
    setCategories(buildTree(data || []));
  };

  // Build tree from flat list
  const buildTree = (flat: ProductCategory[]): ProductCategory[] => {
    const map = new Map<number, ProductCategory>();
    const roots: ProductCategory[] = [];

    flat.forEach((item) => {
      map.set(item.category_id, { ...item, _children: [] });
    });

    map.forEach((item) => {
      if (item.parent_category_id && map.has(item.parent_category_id)) {
        map.get(item.parent_category_id)!._children!.push(item);
      } else {
        roots.push(item);
      }
    });

    return roots;
  };

  useEffect(() => {
    if (authorized) fetchCategories();
  }, [authorized]);

  /* ---------------- TABULATOR ---------------- */
  useEffect(() => {
    if (!tableRef.current || !authorized) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      data: categories,
      reactiveData: true,
      pagination: true,
      paginationSize: 50,
      dataTree: true,
      dataTreeStartExpanded: true,
      columns: [
        { title: 'SL', formatter: 'rownum', hozAlign: 'center', width: 80 },
        { title: 'Category Name', field: 'category_name', hozAlign: 'left' },
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
            const rowData = cell.getRow().getData() as ProductCategory;

            // Live permissions
            const livePermissions = permissions;

            // Edit button
            if (livePermissions.edit) {
              const editBtn = document.createElement('button');
              editBtn.className = 'bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600';
              editBtn.textContent = 'Edit';
              editBtn.onclick = () => {
                if (!livePermissions.edit) return alert('You no longer have permission to edit this record.');
                handleEdit(rowData);
              };
              container.appendChild(editBtn);
            }

            // Delete button
            if (livePermissions.delete) {
              const delBtn = document.createElement('button');
              delBtn.className = 'bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600';
              delBtn.textContent = 'Delete';
              delBtn.onclick = () => {
                if (!livePermissions.delete) return alert('You no longer have permission to delete this record.');
                handleDelete(rowData.category_id);
              };
              container.appendChild(delBtn);
            }

            return container;
          },
        },
      ],
    });
  }, [categories, permissions, authorized]);

  /* ---------------- SEARCH ---------------- */
  useEffect(() => {
    if (!tabulator.current) return;
    tabulator.current.clearFilter(true);
    if (search) tabulator.current.addFilter('category_name', 'like', search);
  }, [search]);

  /* ---------------- CRUD ---------------- */
  const handleAdd = async () => {
    if (!permissions.create) return alert('You do not have permission to create.');
    if (!form.category_name) return alert('Category Name is required');

    const { data: inserted, error } = await supabase
      .from('product_categories')
      .insert([{ ...form, parent_category_id: form.parent_category_id || null }])
      .select();
    if (error) return alert(error.message);

    if (inserted) fetchCategories();
    resetForm();
  };

  const handleEdit = (row: ProductCategory) => {
    if (!permissions.edit) return alert('You do not have permission to edit.');
    setEditing(row);
    setForm({
      category_name: row.category_name,
      parent_category_id: row.parent_category_id || 0,
      description: row.description || '',
      is_active: row.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editing) return alert('No record selected for update.');
    if (!permissions.edit) return alert('You no longer have permission to update this record.');

    const { data: updated, error } = await supabase
      .from('product_categories')
      .update({ ...form, parent_category_id: form.parent_category_id || null })
      .eq('category_id', editing.category_id)
      .select();

    if (error) return alert(error.message);

    if (updated) fetchCategories();
    resetForm();
  };

  const handleDelete = async (id: number) => {
    if (!permissions.delete) return alert('You no longer have permission to delete this record.');
    if (!confirm('Are you sure to delete this category?')) return;

    const { error } = await supabase.from('product_categories').delete().eq('category_id', id);
    if (error) return alert(error.message);

    fetchCategories();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      category_name: '',
      parent_category_id: 0,
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
    <PageWrapper title="Product Categories (Tree)">
      {/* Form */}
      {(permissions.create || (permissions.edit && editing)) && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 bg-white p-4 rounded shadow">
          <FormInput
            label="Category Name"
            value={form.category_name}
            onChange={(e) => setForm({ ...form, category_name: e.target.value })}
          />

          <FormSelect
            label="Parent Category"
            options={[
              { value: 0, label: 'None' },
              ...categories.map((c) => ({ value: c.category_id, label: c.category_name })),
            ]}
            value={form.parent_category_id}
            onChange={(e) => setForm({ ...form, parent_category_id: Number(e.target.value) })}
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
                  Add Category
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <FormInput placeholder="Search Category..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Tree Table */}
      <div className="bg-white rounded shadow p-2">
        <div ref={tableRef}></div>
      </div>
    </PageWrapper>
  );
}
