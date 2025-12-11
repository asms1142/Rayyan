import Navbar from "../../components/Navbar";
import useRequireAuth from "../../lib/useRequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Stats {
  organizations: number;
  branches: number;
}

export default function SuperAdminDashboard() {
  const loading = useRequireAuth();
  const [stats, setStats] = useState<Stats>({ organizations: 0, branches: 0 });

  useEffect(() => {
    if (!loading) fetchStats();
  }, [loading]);

  const fetchStats = async () => {
    // Call API route
    const res = await fetch("/api/stats");
    const data = await res.json();
    setStats(data);
  };

  if (loading) return <p className="p-8">Loading...</p>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="p-8">
        <h1 className="text-3xl font-bold mb-6">Super Admin Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded shadow text-center">
            <h2 className="text-xl font-semibold">Organizations</h2>
            <p className="text-3xl mt-2">{stats.organizations}</p>
          </div>
          <div className="bg-white p-6 rounded shadow text-center">
            <h2 className="text-xl font-semibold">Branches</h2>
            <p className="text-3xl mt-2">{stats.branches}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
