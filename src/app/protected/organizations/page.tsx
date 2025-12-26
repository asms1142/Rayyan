'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import 'tabulator-tables/dist/css/tabulator.min.css';
import { TabulatorFull as Tabulator } from 'tabulator-tables';

import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

interface Organization {
  org_id: number;
  org_code: string | null;
  orgname: string;
  address: string;
  phone: string;
  email: string;
  sub_type: string | null;
  created_at: string;
  created_by: string;
}

export default function OrganizationsPage() {
  const { authorized, loading: permissionLoading } =
    usePermission('organizations');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);
  const tabulator = useRef<Tabulator>();

  /* ================= Fetch Organizations ================= */
  const fetchOrganizations = async () => {
    try {
      setLoadingData(true);
      console.log('🔄 Fetching organizations...');

      /** 1️⃣ Organizations */
      const { data: orgs, error: orgErr } = await supabase
        .from('organization')
        .select(`
          org_id,
          org_code,
          orgname,
          address,
          phone,
          email,
          sub_type,
          created_at
        `)
        .order('orgname');

      if (orgErr) throw orgErr;
      console.log('📦 Organizations:', orgs);

      /** 2️⃣ Customers + creators */
      const { data: customers, error: cusErr } = await supabase
        .from('customer')
        .select(`
          org_id,
          created_at,
          userinfo (
            nickname
          )
        `);

      if (cusErr) throw cusErr;
      console.log('📦 Customers:', customers);

      /** 3️⃣ Build creator map (earliest customer per org) */
      const creatorMap = new Map<number, string>();

      customers?.forEach((c: any) => {
        if (!creatorMap.has(c.org_id)) {
          creatorMap.set(c.org_id, c.userinfo?.nickname ?? '-');
        }
      });

      /** 4️⃣ Merge */
      const mapped: Organization[] =
        orgs?.map((o) => ({
          ...o,
          created_by: creatorMap.get(o.org_id) ?? '-',
        })) || [];

      console.log('✅ Final mapped organizations:', mapped);
      setOrganizations(mapped);
    } catch (err) {
      console.error('🔥 Failed to fetch organizations:', err);
      setOrganizations([]);
    } finally {
      setLoadingData(false);
    }
  };

  /* ================= Init Tabulator ================= */
  useEffect(() => {
    if (!tableRef.current) return;

    tabulator.current?.destroy();

    tabulator.current = new Tabulator(tableRef.current, {
      height: '600px',
      layout: 'fitColumns',
      data: organizations,
      reactiveData: true,
      pagination: 'local',
      paginationSize: 50,
      columns: [
        { title: 'SL', formatter: 'rownum', width: 70, hozAlign: 'center' },
        { title: 'Code', field: 'org_code', hozAlign: 'center' },
        { title: 'Organization Name', field: 'orgname', minWidth: 200 },
        {
          title: 'Contact',
          formatter: (cell) => {
            const row = cell.getData() as Organization;
            return `
              <div class="flex flex-col text-sm leading-tight">
                <span>${row.address}</span>
                <span>${row.phone}</span>
                <span>${row.email}</span>
              </div>
            `;
          },
        },
        { title: 'Sub Type', field: 'sub_type', hozAlign: 'center' },
        { title: 'Created By', field: 'created_by' },
        {
          title: 'Created At',
          field: 'created_at',
          hozAlign: 'center',
          formatter: (cell) =>
            new Date(cell.getValue()).toLocaleString(),
        },
      ],
    });
  }, [organizations]);

  /* ================= Search ================= */
  useEffect(() => {
    if (!tabulator.current) return;

    tabulator.current.clearFilter(true);

    if (search) {
      tabulator.current.addFilter((row) =>
        [
          row.orgname,
          row.org_code,
          row.address,
          row.phone,
          row.email,
          row.sub_type,
          row.created_by,
        ].some((v) =>
          v?.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search]);

  /* ================= Load ================= */
  useEffect(() => {
    if (authorized) fetchOrganizations();
  }, [authorized]);

  /* ================= Render ================= */
  if (permissionLoading || loadingData)
    return <Loader message="Loading organizations..." />;

  if (!authorized)
    return (
      <div className="p-10 text-center text-red-600 font-semibold">
        Unauthorized
      </div>
    );

  return (
    <PageWrapper title="Organization Management">
      <div className="mb-4">
        <FormInput
          placeholder="Search by Name, Code, Contact, Sub Type, Created By"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded shadow p-2">
        <div ref={tableRef} />
      </div>
    </PageWrapper>
  );
}
