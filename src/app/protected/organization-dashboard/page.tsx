'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';
import { supabase } from '@/lib/supabaseClient';

interface OrgMetrics {
  total_customers: number;
  total_projects: number;
  tickets_opened: number;
  tickets_in_progress: number;
  tickets_completed: number;
  tickets_held_up: number;
  tickets_archived: number;
}

export default function OrganizationDashboard() {
  const { authorized, loading } = usePermission('organization-dashboard');

  const [metrics, setMetrics] = useState<OrgMetrics>({
    total_customers: 0,
    total_projects: 0,
    tickets_opened: 0,
    tickets_in_progress: 0,
    tickets_completed: 0,
    tickets_held_up: 0,
    tickets_archived: 0,
  });

  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authorized) return;

    const fetchDashboard = async () => {
      setFetching(true);

      try {
        /* 1️⃣ Get logged-in auth user */
        const { data: session } = await supabase.auth.getSession();
        const authUid = session?.session?.user?.id;
        if (!authUid) return;

        /* 2️⃣ Get org_id from userinfo */
        const { data: userinfo, error: userError } = await supabase
          .from('userinfo')
          .select('org_id')
          .eq('auth_uid', authUid)
          .single();

        if (userError || !userinfo?.org_id) {
          console.error('Userinfo error:', userError);
          return;
        }

        const orgId = userinfo.org_id;

        /* 3️⃣ Customers (org based) */
        const { count: customerCount } = await supabase
          .from('customer')
          .select('cus_id', { count: 'exact', head: true })
          .eq('org_id', orgId);

        /* 4️⃣ Projects (org based) */
        const { count: projectCount } = await supabase
          .from('project')
          .select('project_id', { count: 'exact', head: true })
          .eq('org_id', orgId);

        /* 5️⃣ Tokens (Tickets) */
        const { data: tokens, error: tokenError } = await supabase
          .from('tokens')
          .select('status')
          .eq('org_id', orgId);

        if (tokenError) {
          console.error('Token fetch error:', tokenError);
          return;
        }

        /* 6️⃣ Status counter (MATCH ENUM EXACTLY) */
        const counter: Record<string, number> = {
          Opened: 0,
          'In Progress': 0,
          Completed: 0,
          'Held Up': 0,
          Archived: 0,
        };

        tokens?.forEach((t) => {
          if (t.status in counter) {
            counter[t.status]++;
          }
        });

        /* 7️⃣ Set metrics */
        setMetrics({
          total_customers: customerCount ?? 0,
          total_projects: projectCount ?? 0,
          tickets_opened: counter.Opened,
          tickets_in_progress: counter['In Progress'],
          tickets_completed: counter.Completed,
          tickets_held_up: counter['Held Up'],   // ✅ FIXED
          tickets_archived: counter.Archived,
        });
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setFetching(false);
      }
    };

    fetchDashboard();
  }, [authorized]);

  if (loading) return <Loader message="Checking access..." />;

  if (!authorized) {
    return (
      <PageWrapper title="Organization Dashboard">
        <div className="p-10 text-center text-red-500 font-semibold">
          Unauthorized Access
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Organization Dashboard" breadcrumb={[
    { label: "Organization Dashboard" }
  ]}>
      {fetching ? (
        <Loader message="Loading dashboard..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT SIDE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Link href="/protected/customers">
              <div className="bg-white rounded-xl shadow p-6 text-center hover:shadow-lg transition cursor-pointer">
                <div className="text-4xl font-bold text-blue-600">
                  {metrics.total_customers}
                </div>
                <div className="text-gray-500 mt-2">Total Customers</div>
              </div>
            </Link>

            <Link href="/protected/projects">
              <div className="bg-white rounded-xl shadow p-6 text-center hover:shadow-lg transition cursor-pointer">
                <div className="text-4xl font-bold text-green-600">
                  {metrics.total_projects}
                </div>
                <div className="text-gray-500 mt-2">Total Projects</div>
              </div>
            </Link>
          </div>

          {/* RIGHT SIDE */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Ticket Summary</h3>

            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span>Tickets Opened</span><span>{metrics.tickets_opened}</span></li>
              <li className="flex justify-between"><span>Tickets In Progress</span><span>{metrics.tickets_in_progress}</span></li>
              <li className="flex justify-between"><span>Tickets Completed</span><span>{metrics.tickets_completed}</span></li>
              <li className="flex justify-between"><span>Tickets Held Up</span><span>{metrics.tickets_held_up}</span></li>
              <li className="flex justify-between"><span>Archived Tickets</span><span>{metrics.tickets_archived}</span></li>
            </ul>

            <Link
              href="/protected/project-overview"
              className="mt-6 block text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
            >
              View Details
            </Link>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
