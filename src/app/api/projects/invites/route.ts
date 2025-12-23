import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseserver";

export async function POST(req: NextRequest) {
  try {
    // Parse JSON body
    const body = await req.json();
    const {
      project_id,
      user_id,
      cus_id,
      org_id,
      proj_cont_id,
      actioned_by,
    } = body;

    // Validate required fields
    if (
      !project_id ||
      !user_id ||
      !org_id ||
      !cus_id ||
      !proj_cont_id ||
      !actioned_by
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Ensure numbers
    const projContIdNum = Number(proj_cont_id);
    const userIdNum = Number(user_id);
    const projectIdNum = Number(project_id);
    const cusIdNum = Number(cus_id);
    const orgIdNum = Number(org_id);
    const actionedByNum = Number(actioned_by);

    if (
      [projContIdNum, userIdNum, projectIdNum, cusIdNum, orgIdNum, actionedByNum].some(
        (v) => isNaN(v)
      )
    ) {
      return NextResponse.json(
        { error: "Invalid number value in request" },
        { status: 400 }
      );
    }

    // Insert invite into project_users_log
    const { data, error } = await supabaseServer
      .from("project_users_log")
      .insert([
        {
          project_id: projectIdNum,
          user_id: userIdNum,
          cus_id: cusIdNum,
          org_id: orgIdNum,
          proj_cont_id: projContIdNum,
          status: false, // Pending invite
          email_verified: false,
          invite_token: crypto.randomUUID(),
          action_date: new Date().toISOString(),
          actioned_by: actionedByNum,
        },
      ])
      .select();

    if (error) {
      console.error("Failed to create invite:", error);
      return NextResponse.json(
        { error: error.message || "Failed to create invite" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Invite created successfully",
      data,
    });
  } catch (err: any) {
    console.error("Server error:", err);
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    );
  }
}
