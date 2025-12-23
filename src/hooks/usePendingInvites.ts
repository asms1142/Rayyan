import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface PendingInvite {
  pul_id: number;
  project_id: number;
  Status: boolean;
  invite_token: string;
  project: {
    project_name: string;
  };
}

export const usePendingInvites = (userId: number) => {
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvites = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("project_users_Log")
        .select(`
          pul_id,
          Status,
          invite_token,
          project:project_id(project_name)
        `)
        .eq("user_id", userId)
        .eq("Status", false);

      if (error) console.error("Error fetching invites:", error);
      else setPendingInvites(data || []);

      setLoading(false);
    };

    fetchInvites();
  }, [userId]);

  return { pendingInvites, loading, setPendingInvites };
};
