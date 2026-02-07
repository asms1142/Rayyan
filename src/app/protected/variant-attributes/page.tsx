'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

interface VariantAttribute {
  attribute_id: number;
  attribute_name: string;
  is_active: boolean;
  created_at: string;
}

export default function VariantAttributesPage() {
  const { permissions, authorized, loading } =
    usePermission('variant-attributes');

  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [editing, setEditing] = useState<VariantAttribute | null>(null);
  const [form, setForm] = useState({
    attribute_name: '',
    is_active: true,
  });
  const [search, setSearch] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  /* ---------------- FETCH DATA ---------------- */
  const fetchAttributes = async () => {
    const { data, error } = await supabase
      .from('variant_attributes')
      .select('*')
      .order('attribute_name', { ascending: true });

    if (error) return alert('Failed to fetch attributes: ' + error.message);
    setAttributes(data || []);
  };

  useEffect(() => {
    if (authorized) fetchAttributes();
  }, [authorized]);

  /* ---------------- CRUD ---------------- */
  const handleAdd = async () => {
    if (!permissions.create)
      return alert('You do not have permission to create.');
    if (!form.attribute_name.trim()) return alert('Attribute Name is required');

    const { data, error } = await supabase
      .from('variant_attributes')
      .insert([{ attribute_name: form.attribute_name.trim(), is_active: form.is_active }])
      .select();

    if (error) return alert(error.message);
    if (data && tabulator.current) tabulator.current.addData(data, true);
    resetForm();
  };

  const handleEdit = (row: VariantAttribute) => {
    if (!permissions.edit) return alert('You do not have permission to edit.');
    setEditing(row);
    setForm({
      attribute_name: row.attribute_name,
      is_active: row.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editing || !permissions.edit)
      return alert('You do not have permission to update.');
    if (!form.attribute_name.trim()) return alert('Attribute Name is required');

    const { data, error } = await supabase
      .from('variant_attributes')
      .update({ attribute_name: form.attribute_name.trim(), is_active: form.is_active })
      .eq('attribute_id', editing.attribute_id)
      .select();

    if (error) return alert(error.message);

    if (data && data.length && tabulator.current) {
      const row = tabulator.current.getRow(editing.attribute_id);
      if (row) row.update(data[0]);
    }

    resetForm();
  };

  const handleDelete = async (attribute_id: number) => {
    if (!permissions.delete) return alert('You do not have permission to delete.');
    if (!confirm('Are you sure you want to delete this attribute?')) return;

    const { error } = await supabase
      .from('variant_attributes')
      .delete()
      .eq('attribute_id', attribute_id);

    if (error) return alert(error.message);

    const row = tabulator.current?.getRow(attribute_id);
    if (row) row.delete();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ attribute_name: '', is_active: true });
  };

  /* ---------------- TABULATOR ---------------- */
  useEffect(() => {
    if (!tableRef.current) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      index: 'attribute_id', // Tabulator unique row id
      data: attributes,
      reactiveData: true,
      pagination: true,
      paginationSize: 50,
      paginationSizeSelector: [50, 100, 200],
      columns: [
        { title: 'SL No', formatter: 'rownum', width: 80, hozAlign: 'center' },
        { title: 'Attribute Name', field: 'attribute_name', hozAlign: 'left' },
        {
          title: 'Active',
          field: 'is_active',
          hozAlign: 'center',
          formatter: (cell) => (cell.getValue() ? 'Yes' : 'No'),
        },
        {
          title: 'Actions',
          hozAlign: 'center',
          formatter: () => `
            <div class="flex gap-1 justify-center">
              <button class="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-xs">Edit</button>
              <button class="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-xs">Delete</button>
            </div>
          `,
          cellClick: function (e, cell) {
            const rowData = cell.getRow().getData() as VariantAttribute;
            const action = (e.target as HTMLElement).textContent;
            if (action === 'Edit') handleEdit(rowData);
            if (action === 'Delete') handleDelete(rowData.attribute_id);
          },
        },
      ],
    });
  }, [attributes]);

  /* ---------------- SEARCH FILTER ---------------- */
  useEffect(() => {
    if (!tabulator.current) return;
    tabulator.current.clearFilter(true);

    if (search.trim() !== '') {
      tabulator.current.addFilter((data: VariantAttribute) => {
        return data.attribute_name.toLowerCase().includes(search.toLowerCase());
      });
    }
  }, [search, attributes]);

  /* ---------------- RENDER ---------------- */
  return (
    <PageWrapper title="Variant Attributes">
      {loading && <Loader message="Checking permission..." />}
      {!loading && !authorized && (
        <div className="text-center text-red-500 p-10">Unauthorized</div>
      )}

      {authorized && (
        <>
          {/* Form */}
          {(permissions.create || (permissions.edit && editing)) && (
            <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormInput
                label="Attribute Name"
                value={form.attribute_name}
                onChange={(e) =>
                  setForm({ ...form, attribute_name: e.target.value })
                }
              />
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                Active
              </div>
              <div className="flex items-end gap-2 col-span-full">
                {editing ? (
                  <>
                    <button
                      onClick={handleUpdate}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Update
                    </button>
                    <button
                      onClick={resetForm}
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
                    Save
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Search */}
          <div className="flex gap-4 mb-4">
            <FormInput
              placeholder="Search by attribute name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="bg-white p-2 rounded shadow" ref={tableRef}></div>
        </>
      )}
    </PageWrapper>
  );
}
