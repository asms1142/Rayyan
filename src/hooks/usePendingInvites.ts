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
          project_id,
          Status,
          invite_token,
          project:project_id(project_name)
        `)
        .eq("user_id", userId)
        .eq("Status", false);

      if (error) {
        console.error("Error fetching invites:", error);
        setPendingInvites([]);
      } else if (data) {
        // Map to ensure type matches PendingInvite
        const formatted: PendingInvite[] = data.map((item: any) => ({
          pul_id: item.pul_id,
          project_id: item.project_id,
          Status: item.Status,
          invite_token: item.invite_token,
          project: {
            project_name: item.project?.project_name || "",
          },
        }));
        setPendingInvites(formatted);
      } else {
        setPendingInvites([]);
      }

      setLoading(false);
    };

    fetchInvites();
  }, [userId]);

  return { pendingInvites, loading, setPendingInvites };
};
