// api/create-customer/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function generateOrgCode(length = 6) {
  // Alphanumeric uppercase
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Ensure org_code is unique
async function getUniqueOrgCode(supabase: any) {
  let code = generateOrgCode(6);
  let exists = true;

  while (exists) {
    const { data } = await supabase
      .from("organization")
      .select("org_id")
      .eq("org_code", code)
      .single();

    if (!data) exists = false;
    else code = generateOrgCode(6); // retry
  }

  return code;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();

  const { fullname, nickname, email, password, orgname, address, phone, plan_id, trial } = body;

  try {
    // -------------------------------------------
    // BEGIN TRANSACTION
    // -------------------------------------------
    const { data: beginTx, error: beginErr } = await supabase.rpc("begin_transaction");
    if (beginErr) throw new Error("TX Begin Failed: " + beginErr.message);

    // -------------------------------------------
    // 1️⃣ Generate unique org_code
    // -------------------------------------------
    const org_code = await getUniqueOrgCode(supabase);

    // -------------------------------------------
    // 2️⃣ Create organization
    // -------------------------------------------
    const { data: orgData, error: orgErr } = await supabase
      .from("organization")
      .insert([
        {
          orgname,
          address,
          phone,
          email,
          sub_planid: plan_id,
          sub_type: trial ? "Trial" : "Under Subscription",
          email_verified: false,
          org_code, // ✅ include org_code
          comp_id: 1,
        },
      ])
      .select()
      .single();

    if (orgErr) throw new Error("Organization Error: " + orgErr.message);
    const org_id = orgData.org_id;

    // -------------------------------------------
    // 3️⃣ Create auth user
    // -------------------------------------------
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError || !authUser) throw new Error("Auth Error: " + authError?.message);
    const auth_uid = authUser.user?.id;

    // -------------------------------------------
    // 4️⃣ Insert userinfo
    // -------------------------------------------
    const { data: userData, error: userErr } = await supabase
      .from("userinfo")
      .insert([
        {
          fullname,
          nickname,
          email,
          username: email,
          password,
          phone,
          role_id: 2,
          org_id,
          comp_id: 1,
          auth_uid,
        },
      ])
      .select()
      .single();

    if (userErr) throw new Error("UserInfo Error: " + userErr.message);
    const user_id = userData.user_id;

    // -------------------------------------------
    // 5️⃣ Update organization owner
    // -------------------------------------------
    const { error: orgUpdateErr } = await supabase
      .from("organization")
      .update({ user_id })
      .eq("org_id", org_id);

    if (orgUpdateErr) throw new Error("Org Update Error: " + orgUpdateErr.message);

    // -------------------------------------------
    // 6️⃣ Insert default branch
    // -------------------------------------------
    const { error: branchErr } = await supabase.from("org_branch").insert([
      {
        org_id,
        comp_id: 1,
        branchname: orgname + " Main Branch",
        address,
        phone,
        email,
        user_id,
      },
    ]);

    if (branchErr) throw new Error("Branch Error: " + branchErr.message);

    // -------------------------------------------
    // COMMIT TRANSACTION
    // -------------------------------------------
    const { error: commitErr } = await supabase.rpc("commit_transaction");
    if (commitErr) throw new Error("Commit Failed: " + commitErr.message);

    return NextResponse.json({
      success: true,
      message: "Customer + Organization created successfully",
      org_code, // return org_code to frontend if needed
    });
  } catch (err: any) {
    // -------------------------------------------
    // ROLLBACK IF ANY ERROR OCCURS
    // -------------------------------------------
    await supabase.rpc("rollback_transaction");

    return NextResponse.json({
      success: false,
      error: err.message,
    });
  }
}
