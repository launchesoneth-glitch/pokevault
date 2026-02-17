import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { OFFER_EXPIRY_HOURS } from "@/lib/constants";

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
    const { listing_id, amount, message } = body;

    if (!listing_id || amount == null) {
      return NextResponse.json(
        { error: "Missing required fields: listing_id, amount" },
        { status: 400 }
      );
    }

    const offerAmount = parseFloat(amount);
    if (isNaN(offerAmount) || offerAmount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    // Fetch the listing
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Validate listing accepts offers
    if (listing.listing_type !== "buy_now" && listing.listing_type !== "auction_with_buy_now") {
      return NextResponse.json(
        { error: "This listing type does not accept offers" },
        { status: 400 }
      );
    }

    if (!listing.offers_enabled) {
      return NextResponse.json(
        { error: "Offers are not enabled for this listing" },
        { status: 400 }
      );
    }

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "This listing is not currently active" },
        { status: 400 }
      );
    }

    // Validate buyer is not the seller
    if (user.id === listing.seller_id) {
      return NextResponse.json(
        { error: "You cannot make an offer on your own listing" },
        { status: 400 }
      );
    }

    // Validate offer meets minimum
    if (listing.minimum_offer && offerAmount < listing.minimum_offer) {
      return NextResponse.json(
        {
          error: `Offer must be at least $${listing.minimum_offer.toFixed(2)}`,
          minimum_offer: listing.minimum_offer,
        },
        { status: 400 }
      );
    }

    // Check for existing pending offer from this user on this listing
    const { data: existingOffers } = await supabase
      .from("offers")
      .select("id")
      .eq("listing_id", listing_id)
      .eq("buyer_id", user.id)
      .eq("status", "pending")
      .limit(1);

    if (existingOffers && existingOffers.length > 0) {
      return NextResponse.json(
        { error: "You already have a pending offer on this listing. Please withdraw it first." },
        { status: 409 }
      );
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + OFFER_EXPIRY_HOURS);

    // Create the offer
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        listing_id,
        buyer_id: user.id,
        amount: offerAmount,
        message: message || null,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (offerError) {
      return NextResponse.json(
        { error: offerError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ offer }, { status: 201 });
  } catch (err) {
    console.error("POST /api/offers error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
