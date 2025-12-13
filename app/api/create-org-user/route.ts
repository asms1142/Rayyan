// api/create-org-user/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER SIDE ONLY
);

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Read request body
    const { fullname, nickname, email, org_id, phone, comp_id } = await req.json();

    if (!email || !org_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 2️⃣ Invite user (creates auth user + sends email with set-password link)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/set-password?org_id=${org_id}`,
    });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const auth_uid = inviteData.user?.id;

    if (!auth_uid) {
      return NextResponse.json({ error: "Failed to create auth user" }, { status: 500 });
    }

    // 3️⃣ Insert into userinfo table (NO PASSWORD stored)
    const { data: userData, error: userError } = await supabaseAdmin
      .from("userinfo")
      .insert({
        fullname,
        nickname,
        username: email, // default username = email
        email,
        role_id: 2, // organization user
        org_id,
        auth_uid,
        phone,
        comp_id: comp_id || 1, // default 1
      })
      .select()
      .single();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      auth_uid,
      user_id: userData.user_id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
