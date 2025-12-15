// app/api/accept-terms/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { org_id, user_id, ip } = await req.json();

    // 1️⃣ Get active T&C
    const { data: tc, error: tcError } = await supabaseAdmin
      .from("terms_conditions")
      .select("tc_id")
      .eq("is_active", true)
      .single();

    if (tcError || !tc) {
      return NextResponse.json({ error: "Active T&C not found" }, { status: 400 });
    }

    // 2️⃣ Insert org acceptance
    await supabaseAdmin.from("org_tc_acceptance").insert({
      org_id,
      tc_id: tc.tc_id,
      accepted_ip: ip,
    });

    // 3️⃣ Insert user acceptance
    await supabaseAdmin.from("user_tc_acceptance").insert({
      user_id,
      tc_id: tc.tc_id,
      accepted_ip: ip,
    });

    // 4️⃣ Fast flags
    await supabaseAdmin
      .from("organization")
      .update({ tc_accepted: true })
      .eq("org_id", org_id);

    await supabaseAdmin
      .from("userinfo")
      .update({ tc_accepted: true })
      .eq("user_id", user_id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
