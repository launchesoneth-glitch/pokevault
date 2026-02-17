import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if the user is admin or the consignment owner
    const { data: profileData } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profile = profileData as any;

    const { data: consignmentData, error } = await supabase
      .from("consignments")
      .select("*")
      .eq("id", id)
      .single();

    const consignment = consignmentData as any;

    if (error || !consignment) {
      return NextResponse.json(
        { error: "Consignment not found" },
        { status: 404 }
      );
    }

    // Only the owner or admin can view consignment details
    if (consignment.consigner_id !== user.id && !profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ consignment });
  } catch (err) {
    console.error("GET /api/consignments/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin role
    const { data: profileData2, error: profileError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    const profile = profileData2 as any;

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      status,
      tracking_number_inbound,
      shipping_carrier_inbound,
      notes,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updateData.status = status;

      // Set timestamps based on status transitions
      if (status === "received") {
        updateData.received_at = new Date().toISOString();
      } else if (status === "processing") {
        updateData.processed_at = new Date().toISOString();
      }
    }

    if (tracking_number_inbound !== undefined) {
      updateData.tracking_number_inbound = tracking_number_inbound;
    }

    if (shipping_carrier_inbound !== undefined) {
      updateData.shipping_carrier_inbound = shipping_carrier_inbound;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data: consignmentData2, error } = await supabase
      .from("consignments")
      .update(updateData as any)
      .eq("id", id)
      .select()
      .single();

    const consignment = consignmentData2 as any;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!consignment) {
      return NextResponse.json(
        { error: "Consignment not found" },
        { status: 404 }
      );
    }

    // Notify the consigner about status changes
    if (status) {
      await supabase.from("notifications").insert({
        user_id: consignment.consigner_id,
        type: "consignment_status",
        title: "Consignment Status Updated",
        message: `Your consignment has been updated to: ${status.replace(/_/g, " ")}`,
        data: {
          consignment_id: id,
          new_status: status,
        },
      });
    }

    return NextResponse.json({ consignment });
  } catch (err) {
    console.error("PUT /api/consignments/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
