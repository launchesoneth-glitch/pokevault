import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: listing, error } = await supabase
      .from("listings")
      .select(
        "*, category:categories(*), listing_images(*), pokemon_card:pokemon_cards(*)"
      )
      .eq("id", id)
      .single();

    if (error || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Increment view count using admin client to bypass RLS
    const adminClient = createAdminClient();
    await adminClient
      .from("listings")
      .update({ view_count: listing.view_count + 1 })
      .eq("id", id);

    return NextResponse.json({ listing });
  } catch (err) {
    console.error("GET /api/listings/[id] error:", err);
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
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Remove fields that should not be directly updated
    const {
      id: _id,
      created_at: _createdAt,
      ...updateData
    } = body;

    const { data: listing, error } = await supabase
      .from("listings")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select(
        "*, category:categories(*), listing_images(*), pokemon_card:pokemon_cards(*)"
      )
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ listing });
  } catch (err) {
    console.error("PUT /api/listings/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check listing exists and can be cancelled
    const { data: existingListing, error: fetchError } = await supabase
      .from("listings")
      .select("id, status, bid_count")
      .eq("id", id)
      .single();

    if (fetchError || !existingListing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (existingListing.status === "sold" || existingListing.status === "cancelled") {
      return NextResponse.json(
        { error: `Cannot cancel a listing that is already ${existingListing.status}` },
        { status: 400 }
      );
    }

    // Cancel listing (soft delete)
    const { data: listing, error } = await supabase
      .from("listings")
      .update({
        status: "cancelled" as const,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ listing, message: "Listing cancelled successfully" });
  } catch (err) {
    console.error("DELETE /api/listings/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
