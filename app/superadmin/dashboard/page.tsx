"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SuperadminDashboard() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Superadmin Dashboard</h1>

        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Organizations */}
        <div className="border rounded p-4">
          <h2 className="font-semibold text-lg mb-2">Organizations</h2>
          <p className="text-sm text-gray-600 mb-4">
            Manage tenant companies (organizations).
          </p>

          <button
            onClick={() => router.push("/superadmin/organizations")}
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            Manage Organizations
          </button>
        </div>

        {/* Branches */}
        <div className="border rounded p-4">
          <h2 className="font-semibold text-lg mb-2">Branches</h2>
          <p className="text-sm text-gray-600 mb-4">
            Manage branches under organizations.
          </p>

          <button
            onClick={() => router.push("/superadmin/branches")}
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            Manage Branches
          </button>
        </div>

        {/* Subscriptions */}
        <div className="border rounded p-4">
          <h2 className="font-semibold text-lg mb-2">Subscriptions</h2>
          <p className="text-sm text-gray-600 mb-4">
            Manage subscription plans.
          </p>

          <button
            onClick={() => router.push("/superadmin/subscription-management")}
            className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700"
          >
            Manage Subscriptions
          </button>
        </div>
      </div>
    </div>
  );
}
