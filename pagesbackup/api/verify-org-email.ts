// pages/api/verify-org-email.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { org_id } = req.body;

    if (!org_id) {
      return res.status(400).json({ error: "Missing org_id" });
    }

    const { error } = await supabaseAdmin
      .from("organization")
      .update({ email_verified: true })
      .eq("org_id", org_id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
