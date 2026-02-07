// File: src/app/api/product-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const org_id = Number(url.searchParams.get("org_id"));
    if (!org_id) {
      return NextResponse.json({ error: "org_id is required" }, { status: 400 });
    }

    // Fetch existing settings
    let { data: settings, error } = await supabase
      .from("org_product_settings")
      .select("*")
      .eq("org_id", org_id)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Insert default row if not exist
    if (!settings) {
      const defaultRow = {
        org_id,
        is_brand_applicable: false,
        is_product_group_applicable: false,
        product_code_mode: "AUTO",
        is_barcode_applicable: false,
        barcode_mode: null,
        is_warranty_applicable: false,
        is_serial_no_applicable: false,
        is_expiry_applicable: false,
        default_tax_rate: 0,
        default_currency: "BDT",
        is_active: true,
      };

      const { data: insertedRow, error: insertError } = await supabase
        .from("org_product_settings")
        .insert(defaultRow)
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      settings = insertedRow;
    }

    return NextResponse.json(settings);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const org_id = body.org_id;
    if (!org_id) {
      return NextResponse.json({ error: "org_id is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("org_product_settings")
      .update({
        is_brand_applicable: body.is_brand_applicable,
        is_product_group_applicable: body.is_product_group_applicable,
        product_code_mode: body.product_code_mode,
        is_barcode_applicable: body.is_barcode_applicable,
        barcode_mode: body.barcode_mode,
        is_warranty_applicable: body.is_warranty_applicable,
        is_serial_no_applicable: body.is_serial_no_applicable,
        is_expiry_applicable: body.is_expiry_applicable,
        default_tax_rate: body.default_tax_rate,
        default_currency: body.default_currency,
        updated_at: new Date().toISOString(),
      })
      .eq("org_id", org_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
