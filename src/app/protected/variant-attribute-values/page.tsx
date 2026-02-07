'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TabulatorFull as Tabulator } from 'tabulator-tables';
import 'tabulator-tables/dist/css/tabulator.min.css';
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import FormSelect from '@/components/ui/FormSelect';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

interface VariantAttribute {
  attribute_id: number;
  attribute_name: string;
}

interface VariantAttributeValue {
  value_id: number;
  attribute_id: number;
  value_name: string;
  is_active: boolean;
  created_at: string;
}

export default function VariantAttributeValuesPage() {
  const { permissions, authorized, loading } =
    usePermission('variant-attribute-values');

  const [attributes, setAttributes] = useState<VariantAttribute[]>([]);
  const [values, setValues] = useState<VariantAttributeValue[]>([]);
  const [editing, setEditing] = useState<VariantAttributeValue | null>(null);
  const [form, setForm] = useState({
    attribute_id: 0,
    value_name: '',
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

  const fetchValues = async () => {
    const { data, error } = await supabase
      .from('variant_attribute_values')
      .select('*')
      .order('value_id', { ascending: false });
    if (error) return alert('Failed to fetch values: ' + error.message);
    setValues(data || []);
  };

  useEffect(() => {
    if (authorized) {
      fetchAttributes();
      fetchValues();
    }
  }, [authorized]);

  /* ---------------- CRUD ---------------- */
  const handleAdd = async () => {
    if (!permissions.create) return alert('You do not have permission to create.');
    if (!form.value_name.trim() || !form.attribute_id)
      return alert('Attribute and Value Name are required');

    const { data, error } = await supabase
      .from('variant_attribute_values')
      .insert([
        {
          attribute_id: form.attribute_id,
          value_name: form.value_name.trim(),
          is_active: form.is_active,
        },
      ])
      .select();

    if (error) return alert(error.message);
    if (data && tabulator.current) tabulator.current.addData(data, true);
    resetForm();
  };

  const handleEdit = (row: VariantAttributeValue) => {
    if (!permissions.edit) return alert('You do not have permission to edit.');
    setEditing(row);
    setForm({
      attribute_id: row.attribute_id,
      value_name: row.value_name,
      is_active: row.is_active,
    });
  };

  const handleUpdate = async () => {
    if (!editing || !permissions.edit)
      return alert('You do not have permission to update.');
    if (!form.value_name.trim() || !form.attribute_id)
      return alert('Attribute and Value Name are required');

    const { data, error } = await supabase
      .from('variant_attribute_values')
      .update({
        attribute_id: form.attribute_id,
        value_name: form.value_name.trim(),
        is_active: form.is_active,
      })
      .eq('value_id', editing.value_id)
      .select();

    if (error) return alert(error.message);

    // ✅ Update the row properly in Tabulator
    if (data && data.length && tabulator.current) {
      const row = tabulator.current.getRow(editing.value_id);
      if (row) row.update(data[0]);
    }

    resetForm();
  };

  const handleDelete = async (value_id: number) => {
    if (!permissions.delete) return alert('You do not have permission to delete.');
    if (!confirm('Are you sure you want to delete this value?')) return;

    const { error } = await supabase
      .from('variant_attribute_values')
      .delete()
      .eq('value_id', value_id);
    if (error) return alert(error.message);

    const row = tabulator.current?.getRow(value_id);
    if (row) row.delete();
  };

  const resetForm = () => {
    setEditing(null);
    setForm({ attribute_id: 0, value_name: '', is_active: true });
  };

  /* ---------------- TABULATOR ---------------- */
  useEffect(() => {
    if (!tableRef.current) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      index: 'value_id', // Tabulator uses value_id as unique ID
      data: values,
      reactiveData: true,
      pagination: true,
      paginationSize: 50,
      paginationSizeSelector: [50, 100, 200],
      columns: [
        { title: 'SL No', formatter: 'rownum', width: 80, hozAlign: 'center' },
        {
          title: 'Attribute',
          field: 'attribute_id',
          hozAlign: 'left',
          formatter: (cell) =>
            attributes.find((a) => a.attribute_id === cell.getValue())
              ?.attribute_name || '-',
        },
        { title: 'Value Name', field: 'value_name', hozAlign: 'left' },
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
            const rowData = cell.getRow().getData() as VariantAttributeValue;
            const action = (e.target as HTMLElement).textContent;
            if (action === 'Edit') handleEdit(rowData);
            if (action === 'Delete') handleDelete(rowData.value_id);
          },
        },
      ],
    });
  }, [values, attributes]);

  /* ---------------- SEARCH FILTER ---------------- */
  useEffect(() => {
    if (!tabulator.current) return;

    tabulator.current.clearFilter(true);

    if (search.trim() !== '') {
      tabulator.current.addFilter((data: VariantAttributeValue) => {
        const attrName =
          attributes.find((a) => a.attribute_id === data.attribute_id)
            ?.attribute_name.toLowerCase() || '';
        return (
          data.value_name.toLowerCase().includes(search.toLowerCase()) ||
          attrName.includes(search.toLowerCase())
        );
      });
    }
  }, [search, values, attributes]);

  return (
    <PageWrapper title="Variant Attribute Values">
      {loading && <Loader message="Checking permission..." />}
      {!loading && !authorized && (
        <div className="text-center text-red-500 p-10">Unauthorized</div>
      )}

      {authorized && (
        <>
          {/* Form */}
          {(permissions.create || (permissions.edit && editing)) && (
            <div className="bg-white p-4 rounded shadow mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormSelect
                label="Attribute"
                options={[
                  { value: 0, label: 'Select Attribute' },
                  ...attributes.map((a) => ({
                    value: a.attribute_id,
                    label: a.attribute_name,
                  })),
                ]}
                value={form.attribute_id}
                onChange={(e) =>
                  setForm({ ...form, attribute_id: Number(e.target.value) })
                }
              />

              <FormInput
                label="Value Name"
                value={form.value_name}
                onChange={(e) => setForm({ ...form, value_name: e.target.value })}
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
              placeholder="Search by value or attribute..."
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
