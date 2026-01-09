'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';

import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

interface Customer {
  cus_id: number;
  cus_code: string | null;
  cus_name: string;
  cus_address: string | null;
  cus_email: string | null;
  cus_mobile_no: string | null;
  cus_phone_no: string | null;
  org_id: number;
  created_at: string;
  user_id: number;
  org_name?: string;
  created_by?: string;
}

export default function CustomersPage() {
  const { permissions, authorized, loading: permissionLoading } = usePermission('customers');

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();
  const [orgId, setOrgId] = useState<number | null>(null);

  /** ================= Get current user & org ================= */
  useEffect(() => {
    const init = async () => {
      try {
        setLoadingData(true);
        console.log('Initializing customer page...');

        const { data: sessionData } = await supabase.auth.getSession();
        const authUid = sessionData?.session?.user.id;
        if (!authUid) throw new Error('No active session');

        const { data: userinfo, error: userErr } = await supabase
          .from('userinfo')
          .select('user_id, org_id, fullname')
          .eq('auth_uid', authUid)
          .single();

        if (userErr) throw userErr;
        if (!userinfo) throw new Error('User info not found');

        setOrgId(userinfo.org_id);
        await fetchCustomers(userinfo.org_id);
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoadingData(false);
      }
    };

    if (authorized) init();
  }, [authorized]);

  /** ================= Fetch Customers ================= */
  const fetchCustomers = async (org_id: number) => {
    try {
      console.log('Fetching customers for org_id:', org_id);

      const { data, error } = await supabase
        .from('customer')
        .select(`
          cus_id,
          cus_code,
          cus_name,
          cus_address,
          cus_email,
          cus_mobile_no,
          cus_phone_no,
          org_id,
          created_at,
          user_id,
          organization(orgname),
          userinfo(fullname)
        `)
        .eq('org_id', org_id)
        .order('cus_name', { ascending: true });

      if (error) throw error;

      const mapped: Customer[] = (data || []).map((c: any) => ({
        ...c,
        org_name: c.organization?.orgname || '-',
        created_by: c.userinfo?.fullname || '-',
      }));

      console.log('Customers fetched:', mapped);
      setCustomers(mapped);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomers([]);
    }
  };

  /** ================= Tabulator ================= */
  useEffect(() => {
    if (!tableRef.current) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '600px',
      layout: 'fitColumns',
      data: customers,
      reactiveData: true,
      pagination: true,
      paginationSize: 50,
      columns: [
        { title: 'SL', formatter: 'rownum', width: 70, hozAlign: 'center' },
        { title: 'Code', field: 'cus_code', hozAlign: 'center' },
        { title: 'Customer Name', field: 'cus_name', hozAlign: 'left' },
        {
          title: 'Contact',
          field: 'cus_id',
          formatter: (cell) => {
            const row = cell.getData() as Customer;
            return `
              <div class="flex flex-col text-sm">
                <span>${row.cus_address || '-'}</span>
                <span>${row.cus_email || '-'}</span>
                <span>${row.cus_mobile_no || '-'}</span>
                <span>${row.cus_phone_no || '-'}</span>
              </div>
            `;
          },
        },
        { title: 'Organization', field: 'org_name', hozAlign: 'left' },
        { title: 'Created By', field: 'created_by', hozAlign: 'left' },
        {
          title: 'Created At',
          field: 'created_at',
          hozAlign: 'center',
          formatter: (cell) => new Date(cell.getValue()).toLocaleString(),
        },
      ],
      rowFormatter: (row) => {
        const el = row.getElement();
        el.classList.add('hover:bg-gray-100', 'transition', 'cursor-pointer');
      },
    });
  }, [customers]);

  /** ================= Search ================= */
  useEffect(() => {
    if (!tabulator.current) return;
   tabulator.current.clearFilter(true);

if (search) {
  tabulator.current.setFilter(
    [
      { field: "cus_name", type: "like", value: search },
      { field: "cus_email", type: "like", value: search },
      { field: "cus_mobile_no", type: "like", value: search },
      { field: "cus_phone_no", type: "like", value: search },
    ],
    "or"
  );
}
  }, [search]);

  /** ================= Render ================= */
  if (permissionLoading || loadingData) return <Loader message="Loading customers..." />;
  if (!authorized) return <div className="text-center text-red-600 p-10 font-semibold">Unauthorized</div>;

  return (
    <PageWrapper title="Customer Management">
      <div className="mb-4">
        <FormInput
          placeholder="Search by Name, Email, Mobile, Phone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow p-2">
        <div ref={tableRef}></div>
      </div>
    </PageWrapper>
  );
}
