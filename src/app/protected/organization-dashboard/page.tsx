'use client';

import { useEffect, useState } from 'react';
import PageWrapper from '@/components/ui/PageWrapper';
import { Loader } from '@/components/ui/Loader';
import { usePermission } from '@/hooks/usePermission';
import { supabase } from '@/lib/supabaseClient';

interface OrgMetrics {
  total_customers: number;
  total_projects: number;
  new_tickets: number;
  tickets_wip: number;
  tickets_resolved: number;
  tickets_archived: number;
}

export default function OrganizationDashboard() {
  /** RBAC */
  const { authorized, loading, permissions } = usePermission('organization-dashboard');

  /** Metrics state */
  const [metrics, setMetrics] = useState<OrgMetrics>({
    total_customers: 0,
    total_projects: 0,
    new_tickets: 0,
    tickets_wip: 0,
    tickets_resolved: 0,
    tickets_archived: 0,
  });

  const [fetching, setFetching] = useState(true);

  /** Fetch org-wise metrics */
  useEffect(() => {
    const fetchMetrics = async () => {
      setFetching(true);

      try {
        // Get logged-in user
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user.id;

        if (!userId) {
          setFetching(false);
          return;
        }

        // Get user's org_id
        const { data: userInfo, error: userError } = await supabase
          .from('userinfo')
          .select('org_id')
          .eq('auth_uid', userId)
          .single();

        if (userError || !userInfo) {
          console.error('Error fetching user info:', userError);
          setFetching(false);
          return;
        }

        const orgId = userInfo.org_id;

        /** Fetch total customers */
        const { count: customerCount, error: customerError } = await supabase
          .from('customer')
          .select('cus_id', { count: 'exact', head: true })
          .eq('org_id', orgId);

        if (customerError) {
          console.error('Error fetching customers:', customerError);
        }

        /** Fetch total projects */
        // Assuming you have a 'projects' table linked to customer or org
        const { count: projectCount, error: projectError } = await supabase
          .from('projects')
          .select('proj_id', { count: 'exact', head: true })
          .eq('org_id', orgId);

        if (projectError) {
          console.error('Error fetching projects:', projectError);
        }

        setMetrics({
          total_customers: customerCount || 0,
          total_projects: projectCount || 0,
          new_tickets: 0, // placeholder
          tickets_wip: 0, // placeholder
          tickets_resolved: 0, // placeholder
          tickets_archived: 0, // placeholder
        });

      } catch (err) {
        console.error('Error fetching metrics:', err);
      } finally {
        setFetching(false);
      }
    };

    if (authorized) fetchMetrics();
  }, [authorized]);

  /** UI states */
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
    <PageWrapper title="Organization Dashboard" breadcrumb={['Dashboard', 'Organization']}>
      {fetching ? (
        <Loader message="Loading metrics..." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Total Customers */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold">{metrics.total_customers}</div>
            <div className="text-gray-500 mt-1">Total Customers</div>
          </div>

          {/* Total Projects */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold">{metrics.total_projects}</div>
            <div className="text-gray-500 mt-1">Total Projects</div>
          </div>

          {/* New Tickets */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold">{metrics.new_tickets}</div>
            <div className="text-gray-500 mt-1">New Tickets</div>
          </div>

          {/* Tickets in WIP */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold">{metrics.tickets_wip}</div>
            <div className="text-gray-500 mt-1">Tickets in WIP</div>
          </div>

          {/* Resolved Tickets */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold">{metrics.tickets_resolved}</div>
            <div className="text-gray-500 mt-1">Resolved Tickets</div>
          </div>

          {/* Archived Tickets */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
            <div className="text-3xl font-bold">{metrics.tickets_archived}</div>
            <div className="text-gray-500 mt-1">Archived Tickets</div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
