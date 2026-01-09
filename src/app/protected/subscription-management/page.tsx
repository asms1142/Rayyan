'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';

import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

interface Plan {
  plan_id: number;
  plan_name: string;
  price: number;
  duration_months: number;
  max_users: number;
  description: string;
  sortindex: number;
}

export default function SubscriptionManagement() {
  /* ================= RBAC ================= */
  const { permissions, authorized, loading } = usePermission('subscription-management');

  /* ================= State ================= */
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const [form, setForm] = useState({
    plan_name: '',
    price: 0,
    duration_months: 1,
    max_users: 1,
    description: '',
    sortindex: 1,
  });

  const [search, setSearch] = useState('');

  /* ================= Tabulator ================= */
  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  /* ================= Data Fetch ================= */
  const fetchPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sortindex', { ascending: true });

    if (error) {
      alert('Failed to fetch plans: ' + error.message);
      return;
    }

    setPlans(data || []);
  };

  useEffect(() => {
    if (authorized) fetchPlans();
  }, [authorized]);

  /* ================= Helpers ================= */
  const getNextSortIndex = () => {
    if (!plans.length) return 1;
    return Math.max(...plans.map((p) => p.sortindex)) + 1;
  };

  const isSortIndexExist = (index: number) =>
    plans.some((p) => p.sortindex === index && (!editingPlan || p.plan_id !== editingPlan.plan_id));

  /* ================= CRUD ================= */
  const handleAdd = async () => {
    if (!permissions.create) return alert('No permission to create');

    if (!form.plan_name.trim()) return alert('Plan name is required');
    if (isSortIndexExist(form.sortindex)) return alert('Sort Index already exists');

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert([form])
      .select();

    if (error) return alert(error.message);

    tabulator.current?.addData(data!, true);
    resetForm();
  };

  const handleEdit = (plan: Plan) => {
    if (!permissions.edit) return;

    setEditingPlan(plan);
    setForm({
      plan_name: plan.plan_name,
      price: plan.price,
      duration_months: plan.duration_months,
      max_users: plan.max_users,
      description: plan.description || '',
      sortindex: plan.sortindex,
    });
  };

  const handleUpdate = async () => {
    if (!editingPlan || !permissions.edit) return;

    if (!form.plan_name.trim()) return alert('Plan name is required');
    if (isSortIndexExist(form.sortindex)) return alert('Sort Index already exists');

    const { data, error } = await supabase
      .from('subscription_plans')
      .update({ ...form, updated_at: new Date() })
      .eq('plan_id', editingPlan.plan_id)
      .select();

    if (error) return alert(error.message);

    tabulator.current?.updateData(data!);
    resetForm();
  };

  const handleDelete = async (id: number) => {
    if (!permissions.delete) return alert('No permission to delete');
    if (!confirm('Are you sure?')) return;

    const { error } = await supabase.from('subscription_plans').delete().eq('plan_id', id);
    if (error) return alert(error.message);

    tabulator.current?.deleteRow(id);
  };

  const resetForm = () => {
    setEditingPlan(null);
    setForm({
      plan_name: '',
      price: 0,
      duration_months: 1,
      max_users: 1,
      description: '',
      sortindex: getNextSortIndex(),
    });
  };

  /* ================= Tabulator Init ================= */
  useEffect(() => {
    if (!tableRef.current) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '520px',
      layout: 'fitColumns',
      data: plans,
      reactiveData: true,
      pagination: true,
      paginationSize: 50,
      columns: [
        { title: 'SL', formatter: 'rownum', width: 70, hozAlign: 'center' },
        { title: 'Plan Name', field: 'plan_name' },
        { title: 'Price', field: 'price', hozAlign: 'right' },
        { title: 'Duration (Months)', field: 'duration_months', hozAlign: 'center' },
        { title: 'Max Users', field: 'max_users', hozAlign: 'center' },
        { title: 'Sort Index', field: 'sortindex', hozAlign: 'center' },
        { title: 'Description', field: 'description' },
        {
          title: 'Actions',
          hozAlign: 'center',
          formatter: () => `
            <div class="flex justify-center gap-2">
              <button class="bg-yellow-500 text-white px-3 py-1 rounded">Edit</button>
              <button class="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
            </div>
          `,
          cellClick: (e, cell) => {
            const data = cell.getRow().getData() as Plan;
            const action = (e.target as HTMLElement).textContent;
            if (action === 'Edit') handleEdit(data);
            if (action === 'Delete') handleDelete(data.plan_id);
          },
        },
      ],
    });
  }, [plans]);

  /* ================= Search ================= */
  useEffect(() => {
    if (!tabulator.current) return;
    tabulator.current.clearFilter(true);
    if (search) tabulator.current.addFilter('plan_name', 'like', search);
  }, [search]);

  /* ================= Render ================= */
  return (
    <PageWrapper title="Subscription Management">
      {loading && <Loader message="Checking access..." />}
      {!loading && !authorized && <div className="text-center text-red-500 p-10">Unauthorized</div>}

      {!loading && authorized && (
        <>
          {(permissions.create || editingPlan) && (
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 bg-white p-4 rounded shadow mb-6">
              <FormInput label="Plan Name" value={form.plan_name} onChange={(e) => setForm({ ...form, plan_name: e.target.value })} />
              <FormInput label="Price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
              <FormInput label="Duration (Months)" type="number" value={form.duration_months} onChange={(e) => setForm({ ...form, duration_months: Number(e.target.value) })} />
              <FormInput label="Max Users" type="number" value={form.max_users} onChange={(e) => setForm({ ...form, max_users: Number(e.target.value) })} />
              <FormInput label="Sort Index" type="number" value={form.sortindex} onChange={(e) => setForm({ ...form, sortindex: Number(e.target.value) })} />
              <FormInput label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

              <div className="md:col-span-6 flex gap-2">
                {editingPlan ? (
                  <>
                    <button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded">Update</button>
                    <button onClick={resetForm} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                  </>
                ) : (
                  <button onClick={handleAdd} className="bg-green-600 text-white px-4 py-2 rounded">Add Plan</button>
                )}
              </div>
            </div>
          )}

          <div className="mb-4">
            <FormInput placeholder="Search plan..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="bg-white rounded shadow p-2">
            <div ref={tableRef}></div>
          </div>
        </>
      )}
    </PageWrapper>
  );
}
