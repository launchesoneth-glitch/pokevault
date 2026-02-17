import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { XP_AWARDS, TIERS } from "@/lib/constants";

type RouteParams = { params: Promise<{ listingId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { listingId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if listing exists
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, favorite_count")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Check if already favorited
    const { data: existingFavorite } = await supabase
      .from("favorites")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .single();

    if (existingFavorite) {
      return NextResponse.json(
        { error: "You have already favorited this listing" },
        { status: 409 }
      );
    }

    // Add favorite
    const { error: favoriteError } = await supabase
      .from("favorites")
      .insert({
        user_id: user.id,
        listing_id: listingId,
      });

    if (favoriteError) {
      return NextResponse.json(
        { error: favoriteError.message },
        { status: 500 }
      );
    }

    // Update listing favorite count
    const adminClient = createAdminClient();
    await adminClient
      .from("listings")
      .update({ favorite_count: listing.favorite_count + 1 })
      .eq("id", listingId);

    // Award XP for favoriting
    await adminClient.from("xp_events").insert({
      user_id: user.id,
      event_type: "favorite_listing",
      xp_amount: XP_AWARDS.FAVORITE_LISTING,
      description: "Favorited a listing",
      reference_id: listingId,
    });

    // Update user XP
    const { data: profile } = await adminClient
      .from("users")
      .select("xp, tier")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newXp = profile.xp + XP_AWARDS.FAVORITE_LISTING;

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

    return NextResponse.json({
      message: "Listing added to favorites",
      favorite_count: listing.favorite_count + 1,
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/favorites/[listingId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { listingId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if listing exists
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, favorite_count")
      .eq("id", listingId)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Remove favorite
    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listingId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    // Update listing favorite count (ensure it doesn't go below 0)
    const adminClient = createAdminClient();
    const newCount = Math.max(0, listing.favorite_count - 1);
    await adminClient
      .from("listings")
      .update({ favorite_count: newCount })
      .eq("id", listingId);

    return NextResponse.json({
      message: "Listing removed from favorites",
      favorite_count: newCount,
    });
  } catch (err) {
    console.error("DELETE /api/favorites/[listingId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
