import { supabase } from "../../lib/supabaseClient";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { count: orgCount, error: orgError } = await supabase
    .from("organization")
    .select("*", { count: "exact" });

  const { count: branchCount, error: branchError } = await supabase
    .from("org_branch")
    .select("*", { count: "exact" });

  if (orgError || branchError) {
    return res.status(500).json({ message: "Error fetching stats" });
  }

  res.status(200).json({
    organizations: orgCount,
    branches: branchCount,
  });
}
