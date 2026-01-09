import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/* ---------------- Supabase Admin Client ---------------- */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVICE ROLE (server-only)
);

/* ---------------- Simple In-Memory Rate Limiter ---------------- */
const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 min
const MAX_REQUESTS = 5;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    /* ---------------- Rate Limiting ---------------- */
    const now = Date.now();
    const record = rateLimitMap.get(ip) || { count: 0, last: now };
    if (now - record.last < RATE_LIMIT_WINDOW && record.count >= MAX_REQUESTS) {
      return NextResponse.json({ error: "Too many requests, try again later" }, { status: 429 });
    }
    rateLimitMap.set(ip, { count: record.count + 1, last: now });

    /* ---------------- Sanitize & Validate Input ---------------- */
    const fullname = (body.fullname || "").trim();
    const nickname = (body.nickname || fullname).trim();
    const email = (body.email || "").trim().toLowerCase();
    const phone = (body.phone || "").trim();
    const username = (body.username || "").trim();
    const role_id = body.role_id;
    const org_id = body.org_id || null;
    const cus_id = body.cus_id || null;
    const comp_id = body.comp_id;

    if (!fullname || !email || !role_id) {
      return NextResponse.json({ error: "Required fields missing" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    /* ---------------- Check Existing User ---------------- */
    const { data: existingUser, error: listError } = await supabaseAdmin
      .from("userinfo")
      .select("auth_uid")
      .eq("email", email)
      .single();

    if (listError && listError.code !== "PGRST116") { // ignore not found
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }
    if (existingUser) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    /* ---------------- Invite User ---------------- */
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/set-password-new`,
    });

    if (inviteError || !inviteData?.user?.id) {
      return NextResponse.json({ error: inviteError?.message || "Failed to send invite" }, { status: 500 });
    }

    const auth_uid = inviteData.user.id;

    /* ---------------- Insert userinfo ---------------- */
    const { error: insertError } = await supabaseAdmin.from("userinfo").insert({
      fullname,
      nickname,
      email,
      phone,
      username,
      role_id,
      org_id,
      cus_id,
      comp_id,
      auth_uid,
    });

    if (insertError) {
      // If DB insert fails, revoke the invite to avoid dangling user
      await supabaseAdmin.auth.admin.deleteUser(auth_uid).catch(() => {});
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    /* ---------------- Success ---------------- */
    return NextResponse.json({
      success: true,
      message: "User created and invitation email sent",
      email,
      auth_uid,
    });
  } catch (err: any) {
    console.error("🔥 [CREATE-USER] Fatal error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
