'use client';

import { useEffect, useState, useRef } from 'react';
import PageWrapper from '@/components/ui/PageWrapper';
import FormInput from '@/components/ui/FormInput';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';
import { supabase } from '@/lib/supabaseClient';

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

export default function NewUserPage() {
  /** ---------------- RBAC ---------------- */
  const { authorized, loading: permissionLoading, permissions } = usePermission('users/create');

  /** ---------------- Form State ---------------- */
  const [fullname, setFullname] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [roleId, setRoleId] = useState<number | ''>('');
  const [orgId, setOrgId] = useState<number | ''>('');
  const [cusId, setCusId] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  /** ---------------- Dropdown Data ---------------- */
  const [roles, setRoles] = useState<Role[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  /** ---------------- Logged-in User ---------------- */
  const [loggedUser, setLoggedUser] = useState<any>(null);

  /** ---------------- Submit Lock / Anti-spam ---------------- */
  const submitLock = useRef(false);

  /** ---------------- Load Logged User ---------------- */
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;

        const { data } = await supabase
          .from('userinfo')
          .select('*')
          .eq('auth_uid', auth.user.id)
          .single();

        setLoggedUser(data);
        if (data?.org_id) setOrgId(data.org_id);
        if (data?.cus_id) setCusId(data.cus_id);
      } catch (err) {
        console.error('❌ Error loading logged-in user');
      }
    };
    loadUser();
  }, []);

  /** ---------------- Load Roles & Organizations ---------------- */
  useEffect(() => {
    const loadBaseData = async () => {
      try {
        const { data: roleData } = await supabase
          .from('userrole')
          .select('role_id, rolename')
          .order('rolename');

        let { data: orgData } = await supabase
          .from('organization')
          .select('org_id, orgname')
          .order('orgname');

        if (loggedUser?.org_id) {
          orgData = orgData?.filter((o: Organization) => o.org_id === loggedUser.org_id) || [];
        }

        setRoles(roleData || []);
        setOrganizations(orgData || []);
      } catch {
        console.error('❌ Error loading roles/orgs');
      }
    };
    loadBaseData();
  }, [loggedUser]);

  /** ---------------- Load Customers based on selected organization ---------------- */
  useEffect(() => {
    if (!orgId) {
      setCustomers([]);
      return;
    }
    const loadCustomers = async () => {
      try {
        const { data } = await supabase
          .from('customer')
          .select('cus_id, cus_name')
          .eq('org_id', orgId)
          .order('cus_name');

        setCustomers(data || []);
      } catch {
        console.error('❌ Error loading customers');
      }
    };
    loadCustomers();
  }, [orgId]);

  /** ---------------- Submit Handler ---------------- */
  const handleSubmit = async () => {
    if (submitLock.current) return; // Anti-spam
    submitLock.current = true;

    setSuccessMessage('');
    setErrorMessage('');

    if (!permissions?.create) {
      setErrorMessage('You do not have permission to create users.');
      submitLock.current = false;
      return;
    }

    if (!fullname.trim() || !email.trim() || !username.trim() || !roleId) {
      setErrorMessage('Please fill all required fields.');
      submitLock.current = false;
      return;
    }

    setLoading(true);

    try {
      const payload = {
        fullname: fullname.trim(),
        nickname: nickname.trim() || fullname.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        username: username.trim(),
        role_id: roleId,
        org_id: orgId || null,
        cus_id: cusId || null,
        comp_id: 1,
      };

      const res = await fetch('/api/create-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data?.error || data?.message || 'Failed to create user';
        throw new Error(message);
      }

      setSuccessMessage('✅ User created and invitation email sent successfully.');

      // Reset form safely (avoid accidental duplicate inserts)
      setFullname('');
      setNickname('');
      setEmail('');
      setPhone('');
      setUsername('');
      setRoleId('');
      if (!loggedUser?.org_id) setOrgId('');
      if (!loggedUser?.cus_id) setCusId('');
    } catch (err: any) {
      console.error('❌ Error creating user:', err);
      setErrorMessage(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
      submitLock.current = false;
    }
  };

  /** ---------------- Guards ---------------- */
  if (permissionLoading) return <Loader message="Checking permissions..." />;
  if (!authorized)
    return (
      <div className="p-6 text-center text-red-500 font-semibold">
        Unauthorized Access
      </div>
    );

  /** ---------------- UI ---------------- */
  return (
    <PageWrapper
      title="Create New User"
      breadcrumb={[
        { label: 'Home', href: '/protected/dashboard' },
        { label: 'Users', href: '/protected/users' },
        { label: 'Create' },
      ]}
    >
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inputs */}
        <FormInput label="Full Name *" value={fullname} onChange={e => setFullname(e.target.value)} />
        <FormInput label="Nickname" value={nickname} onChange={e => setNickname(e.target.value)} />
        <FormInput label="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <FormInput label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
        <FormInput label="Username *" value={username} onChange={e => setUsername(e.target.value)} />

        {/* Role */}
        <div>
          <label className="block mb-1 font-medium">Role *</label>
          <select
            className="w-full border px-3 py-2 rounded"
            value={roleId}
            onChange={e => setRoleId(Number(e.target.value))}
          >
            <option value="">Select Role</option>
            {roles.map(r => <option key={r.role_id} value={r.role_id}>{r.rolename}</option>)}
          </select>
        </div>

        {/* Organization */}
        <div>
          <label className="block mb-1 font-medium">Organization</label>
          <select
            disabled={!!loggedUser?.org_id}
            className={`w-full border px-3 py-2 rounded ${loggedUser?.org_id ? 'bg-gray-50' : ''}`}
            value={orgId || ''}
            onChange={e => setOrgId(Number(e.target.value))}
          >
            <option value="">Select Organization</option>
            {organizations.map(o => <option key={o.org_id} value={o.org_id}>{o.orgname}</option>)}
          </select>
        </div>

        {/* Customer */}
        <div>
          <label className="block mb-1 font-medium">Customer</label>
          <select
            disabled={!!loggedUser?.cus_id}
            className={`w-full border px-3 py-2 rounded ${loggedUser?.cus_id ? 'bg-gray-50' : ''}`}
            value={cusId || ''}
            onChange={e => setCusId(Number(e.target.value))}
          >
            <option value="">Select Customer</option>
            {customers.map(c => <option key={c.cus_id} value={c.cus_id}>{c.cus_name}</option>)}
          </select>
        </div>

        {/* Messages */}
        {(successMessage || errorMessage) && (
          <div className="md:col-span-2 text-center">
            {successMessage && <p className="text-green-600 font-semibold">{successMessage}</p>}
            {errorMessage && <p className="text-red-600 font-semibold">{errorMessage}</p>}
          </div>
        )}

        {/* Submit */}
        <div className="md:col-span-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 w-full md:w-auto"
          >
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
