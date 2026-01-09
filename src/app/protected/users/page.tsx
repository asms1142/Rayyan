'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import PageWrapper from '@/components/ui/PageWrapper';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';

interface User {
  user_id: number;
  fullname: string;
  nickname: string;
  email: string;
  username: string;
  created_at: string;
  role_id: number;
  org_id: number;
  cus_id: number | null;
  userrole?: { rolename: string };
  organization?: { orgname: string };
}

interface Role {
  role_id: number;
  rolename: string;
}

interface Organization {
  org_id: number;
  orgname: string;
}

interface Customer {
  cus_id: number;
  cus_name: string;
}

export default function UsersListPage() {
  /* ---------------- RBAC ---------------- */
  const { authorized, loading: permissionLoading } =
    usePermission('users');

  /* ---------------- State ---------------- */
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  /* Filters */
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [roleId, setRoleId] = useState('');
  const [orgId, setOrgId] = useState('');
  const [cusId, setCusId] = useState('');
  const [search, setSearch] = useState('');

  /* ---------------- Load Filters ---------------- */
  useEffect(() => {
    const loadFilters = async () => {
      const [{ data: roleData }, { data: orgData }, { data: cusData }] =
        await Promise.all([
          supabase.from('userrole').select('role_id, rolename').order('rolename'),
          supabase.from('organization').select('org_id, orgname').order('orgname'),
          supabase.from('customer').select('cus_id, cus_name').order('cus_name'),
        ]);

      setRoles(roleData || []);
      setOrganizations(orgData || []);
      setCustomers(cusData || []);
    };

    loadFilters();
  }, []);

  /* ---------------- Customer Map (FAST LOOKUP) ---------------- */
  const customerMap = useMemo(() => {
    const map: Record<number, string> = {};
    customers.forEach(c => {
      map[c.cus_id] = c.cus_name;
    });
    return map;
  }, [customers]);

  /* ---------------- Load Users ---------------- */
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);

      let query = supabase
        .from('userinfo')
        .select(`
          user_id,
          fullname,
          nickname,
          email,
          username,
          created_at,
          role_id,
          org_id,
          cus_id,
          userrole ( rolename ),
          organization ( orgname )
        `)
        .order('created_at', { ascending: false });

      if (roleId) query = query.eq('role_id', roleId);
      if (orgId) query = query.eq('org_id', orgId);
      if (cusId) query = query.eq('cus_id', cusId);

      if (search) {
        query = query.or(
          `fullname.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, error } = await query;

      if (!error && data) {
        // Fix: map arrays to single objects for TypeScript
        const formattedUsers: User[] = data.map(u => ({
          ...u,
          userrole: u.userrole?.[0] || undefined,
          organization: u.organization?.[0] || undefined,
        }));

        setUsers(formattedUsers);
      }

      setLoading(false);
    };

    loadUsers();
  }, [roleId, orgId, cusId, search]);

  /* ---------------- Guards ---------------- */
  if (permissionLoading) return <Loader type="card" count={1} />;
  if (!authorized)
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Unauthorized Access
      </div>
    );

  /* ---------------- UI ---------------- */
  return (
    <PageWrapper title="Users" breadcrumb={[{ label: 'Home', href: '/protected/dashboard' }, { label: 'Users' }]}>
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email"
          className="border px-3 py-2 rounded"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <select
          className="border px-3 py-2 rounded"
          value={roleId}
          onChange={e => setRoleId(e.target.value)}
        >
          <option value="">All Roles</option>
          {roles.map(r => (
            <option key={r.role_id} value={r.role_id}>
              {r.rolename}
            </option>
          ))}
        </select>

        <select
          className="border px-3 py-2 rounded"
          value={orgId}
          onChange={e => setOrgId(e.target.value)}
        >
          <option value="">All Organizations</option>
          {organizations.map(o => (
            <option key={o.org_id} value={o.org_id}>
              {o.orgname}
            </option>
          ))}
        </select>

        <select
          className="border px-3 py-2 rounded"
          value={cusId}
          onChange={e => setCusId(e.target.value)}
        >
          <option value="">All Customers</option>
          {customers.map(c => (
            <option key={c.cus_id} value={c.cus_id}>
              {c.cus_name}
            </option>
          ))}
        </select>

        <button
          onClick={() => {
            setSearch('');
            setRoleId('');
            setOrgId('');
            setCusId('');
          }}
          className="bg-gray-200 rounded px-4"
        >
          Reset
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <Loader type="table" count={5} />
      ) : (
        <div className="overflow-x-auto bg-white rounded shadow">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="p-3 w-14">SL</th>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Organization</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}

              {users.map((u, index) => (
                <tr key={u.user_id} className="border-t hover:bg-gray-50">
                  <td className="p-3 text-gray-500">{index + 1}</td>
                  <td className="p-3 font-medium">{u.fullname}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.userrole?.rolename || '-'}</td>
                  <td className="p-3">{u.organization?.orgname || '-'}</td>
                  <td className="p-3">
                    {u.cus_id ? customerMap[u.cus_id] || '-' : '-'}
                  </td>
                  <td className="p-3 text-sm text-gray-500">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageWrapper>
  );
}
