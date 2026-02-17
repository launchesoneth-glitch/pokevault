import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { XP_AWARDS, TIERS } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("consignments")
      .select("*", { count: "exact" })
      .eq("consigner_id", user.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status as any);
    }

    query = query.range(from, to);

    const { data: consignments, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      consignments,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    console.error("GET /api/consignments error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tracking_number_inbound,
      shipping_carrier_inbound,
      notes,
    } = body;

    // Create the consignment
    const { data: consignment, error: consignmentError } = await supabase
      .from("consignments")
      .insert({
        consigner_id: user.id,
        status: "pending",
        tracking_number_inbound: tracking_number_inbound || null,
        shipping_carrier_inbound: shipping_carrier_inbound || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (consignmentError) {
      return NextResponse.json(
        { error: consignmentError.message },
        { status: 500 }
      );
    }

    // Award XP for submitting consignment
    const adminClient = createAdminClient();

    await adminClient.from("xp_events").insert({
      user_id: user.id,
      event_type: "submit_consignment",
      xp_amount: XP_AWARDS.SUBMIT_CONSIGNMENT,
      description: "Submitted a new consignment",
      reference_id: consignment.id,
    });

    // Update user XP
    const { data: profile } = await adminClient
      .from("users")
      .select("xp, tier")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newXp = profile.xp + XP_AWARDS.SUBMIT_CONSIGNMENT;

      let newTier = profile.tier;
      for (let i = TIERS.length - 1; i >= 0; i--) {
        if (newXp >= TIERS[i].xpRequired) {
          newTier = TIERS[i].name as typeof newTier;
          break;
        }
      }

      await adminClient
        .from("users")
        .update({ xp: newXp, tier: newTier })
        .eq("id", user.id);
    }

    return NextResponse.json({ consignment }, { status: 201 });
  } catch (err) {
    console.error("POST /api/consignments error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
