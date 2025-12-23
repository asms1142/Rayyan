"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import PageWrapper from "@/components/ui/PageWrapper";
import { Loader } from "@/components/ui/Loader";
import { usePermission } from "@/hooks/usePermission";
import FormInput from "@/components/ui/FormInput";

interface Token {
  token_id: number;
  token_no: string;
  token_title: string;
  created_at: string;
  created_by: string;
  status: string;
}

export default function ProjectTokens() {
  const { authorized, loading: permissionLoading } = usePermission("project-tokens");
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("token_list")
        .select(`
          token_id,
          token_no,
          token_title,
          created_at,
          status,
          creator:userinfo(fullname)
        `)
        .order("token_id", { ascending: false });

      if (error) throw error;

      setTokens(
        (data || []).map((t: any) => ({
          token_id: t.token_id,
          token_no: t.token_no,
          token_title: t.token_title,
          created_at: t.created_at,
          created_by: t.creator?.fullname || "",
          status: t.status,
        }))
      );
    } catch (err) {
      console.error("Fetch tokens error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTokens = useMemo(() => {
    return tokens.filter(
      (t) =>
        !search ||
        t.token_no.toLowerCase().includes(search.toLowerCase()) ||
        t.status.toLowerCase().includes(search.toLowerCase())
    );
  }, [tokens, search]);

  if (permissionLoading || loading) return <Loader message="Loading tokens..." />;
  if (!authorized) return <div className="p-10 text-center text-red-500">Unauthorized</div>;

  return (
    <PageWrapper title="Project Tokens">
      <div className="flex justify-between items-center mb-4">
        <FormInput
          placeholder="Search by Token No or Status"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 mr-2"
        />
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded"
          onClick={() => window.location.href = "/tokens/create"}
        >
          Create New Token
        </button>
      </div>

      <div className="overflow-x-auto bg-white rounded shadow">
        <table className="min-w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">SL</th>
              <th className="border p-2">Token No</th>
              <th className="border p-2">Created At</th>
              <th className="border p-2">Token Title</th>
              <th className="border p-2">Created By</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">View</th>
            </tr>
          </thead>
          <tbody>
            {filteredTokens.map((t, idx) => (
              <tr key={t.token_id} className="hover:bg-gray-50">
                <td className="border p-2">{idx + 1}</td>
                <td className="border p-2">{t.token_no}</td>
                <td className="border p-2">{new Date(t.created_at).toLocaleString()}</td>
                <td className="border p-2">{t.token_title}</td>
                <td className="border p-2">{t.created_by}</td>
                <td className="border p-2">{t.status}</td>
                <td className="border p-2 text-center">
                  <button
                    className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                    onClick={() => window.location.href = `/tokens/${t.token_id}`}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}

            {filteredTokens.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-4">
                  No tokens found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageWrapper>
  );
}
