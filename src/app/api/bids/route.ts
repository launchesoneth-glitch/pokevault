import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getBidIncrement,
  XP_AWARDS,
  ANTI_SNIPE_WINDOW_MS,
  ANTI_SNIPE_EXTENSION_MS,
  TIERS,
} from "@/lib/constants";

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
    const { listing_id, max_bid } = body;

    if (!listing_id || max_bid == null) {
      return NextResponse.json(
        { error: "Missing required fields: listing_id, max_bid" },
        { status: 400 }
      );
    }

    const maxBidAmount = parseFloat(max_bid);
    if (isNaN(maxBidAmount) || maxBidAmount <= 0) {
      return NextResponse.json(
        { error: "max_bid must be a positive number" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch the listing
    const { data: listingData, error: listingError } = await adminClient
      .from("listings")
      .select("*")
      .eq("id", listing_id)
      .single();

    const listing = listingData as any;
    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    // Validate listing is an active auction
    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "This listing is not currently active" },
        { status: 400 }
      );
    }

    if (listing.listing_type !== "auction" && listing.listing_type !== "auction_with_buy_now") {
      return NextResponse.json(
        { error: "This listing does not accept bids" },
        { status: 400 }
      );
    }

    // Check auction has not ended
    if (listing.auction_end && new Date(listing.auction_end) <= new Date()) {
      return NextResponse.json(
        { error: "This auction has already ended" },
        { status: 400 }
      );
    }

    // Check auction has started
    if (listing.auction_start && new Date(listing.auction_start) > new Date()) {
      return NextResponse.json(
        { error: "This auction has not started yet" },
        { status: 400 }
      );
    }

    // Validate bidder is not the seller
    if (user.id === listing.seller_id) {
      return NextResponse.json(
        { error: "You cannot bid on your own listing" },
        { status: 400 }
      );
    }

    // Calculate minimum bid
    const increment = getBidIncrement(listing.current_bid);
    const minimumBid = listing.bid_count === 0
      ? listing.starting_price ?? listing.current_bid
      : listing.current_bid + increment;

    if (maxBidAmount < minimumBid) {
      return NextResponse.json(
        {
          error: `Your maximum bid must be at least $${minimumBid.toFixed(2)}`,
          minimum_bid: minimumBid,
        },
        { status: 400 }
      );
    }

    // Find the current highest bid (by max_bid) to support proxy bidding
    const { data: currentWinningBids } = await adminClient
      .from("bids")
      .select("*")
      .eq("listing_id", listing_id)
      .eq("is_winning", true)
      .order("max_bid", { ascending: false })
      .limit(1);

    const currentWinningBid = (currentWinningBids?.[0] ?? null) as any;

    let newVisibleBid: number;
    let newBidderId: string;
    let newMaxBid: number;
    const bidsToInsert: Array<{
      listing_id: string;
      bidder_id: string;
      amount: number;
      max_bid: number;
      is_winning: boolean;
      is_auto_bid: boolean;
    }> = [];

    if (!currentWinningBid) {
      // First bid on the listing
      newVisibleBid = listing.starting_price ?? maxBidAmount;
      newBidderId = user.id;
      newMaxBid = maxBidAmount;

      bidsToInsert.push({
        listing_id,
        bidder_id: user.id,
        amount: newVisibleBid,
        max_bid: maxBidAmount,
        is_winning: true,
        is_auto_bid: false,
      });
    } else if (currentWinningBid.bidder_id === user.id) {
      // Same bidder updating their max bid
      if (maxBidAmount <= currentWinningBid.max_bid) {
        return NextResponse.json(
          {
            error: `Your new maximum bid must exceed your current maximum of $${currentWinningBid.max_bid.toFixed(2)}`,
          },
          { status: 400 }
        );
      }

      // Update the existing winning bid's max_bid
      await adminClient
        .from("bids")
        .update({ max_bid: maxBidAmount })
        .eq("id", currentWinningBid.id);

      newVisibleBid = listing.current_bid;
      newBidderId = user.id;
      newMaxBid = maxBidAmount;

      // No new bid row needed, just updated max
      return NextResponse.json({
        message: "Maximum bid updated successfully",
        current_bid: newVisibleBid,
        is_winning: true,
        your_max_bid: maxBidAmount,
      });
    } else if (maxBidAmount > currentWinningBid.max_bid) {
      // New bidder outbids the current winner
      // The visible bid goes up to the old winner's max + increment
      const autoBidAmount = Math.min(
        currentWinningBid.max_bid + getBidIncrement(currentWinningBid.max_bid),
        maxBidAmount
      );

      newVisibleBid = autoBidAmount;
      newBidderId = user.id;
      newMaxBid = maxBidAmount;

      // Mark old winning bid as no longer winning
      await adminClient
        .from("bids")
        .update({ is_winning: false })
        .eq("id", currentWinningBid.id);

      bidsToInsert.push({
        listing_id,
        bidder_id: user.id,
        amount: newVisibleBid,
        max_bid: maxBidAmount,
        is_winning: true,
        is_auto_bid: false,
      });
    } else if (maxBidAmount === currentWinningBid.max_bid) {
      // Tie goes to the earlier bidder - current winner retains
      newVisibleBid = maxBidAmount;
      newBidderId = currentWinningBid.bidder_id;
      newMaxBid = currentWinningBid.max_bid;

      // Update the current winning bid amount to show the match
      await adminClient
        .from("bids")
        .update({ amount: newVisibleBid })
        .eq("id", currentWinningBid.id);

      bidsToInsert.push({
        listing_id,
        bidder_id: user.id,
        amount: maxBidAmount,
        max_bid: maxBidAmount,
        is_winning: false,
        is_auto_bid: false,
      });
    } else {
      // Current winner's proxy bid automatically outbids the new bidder
      const autoBidAmount = Math.min(
        maxBidAmount + getBidIncrement(maxBidAmount),
        currentWinningBid.max_bid
      );

      newVisibleBid = autoBidAmount;
      newBidderId = currentWinningBid.bidder_id;
      newMaxBid = currentWinningBid.max_bid;

      // Record the challenger's bid
      bidsToInsert.push({
        listing_id,
        bidder_id: user.id,
        amount: maxBidAmount,
        max_bid: maxBidAmount,
        is_winning: false,
        is_auto_bid: false,
      });

      // Record the auto-bid for the current winner
      await adminClient
        .from("bids")
        .update({ amount: autoBidAmount })
        .eq("id", currentWinningBid.id);
    }

    // Insert new bids
    if (bidsToInsert.length > 0) {
      const { error: bidInsertError } = await adminClient
        .from("bids")
        .insert(bidsToInsert);

      if (bidInsertError) {
        return NextResponse.json(
          { error: "Failed to place bid" },
          { status: 500 }
        );
      }
    }

    // Update listing current_bid and bid_count
    const updateData: Record<string, unknown> = {
      current_bid: newVisibleBid,
      bid_count: listing.bid_count + 1,
      updated_at: new Date().toISOString(),
    };

    // Anti-sniping: extend auction if bid placed in the last ANTI_SNIPE_WINDOW_MS
    if (listing.auto_extend && listing.auction_end) {
      const auctionEnd = new Date(listing.auction_end);
      const now = new Date();
      const timeRemaining = auctionEnd.getTime() - now.getTime();

      if (timeRemaining > 0 && timeRemaining <= ANTI_SNIPE_WINDOW_MS) {
        const newEnd = new Date(
          auctionEnd.getTime() + ANTI_SNIPE_EXTENSION_MS
        );
        updateData.auction_end = newEnd.toISOString();
      }
    }

    await adminClient
      .from("listings")
      .update(updateData as any)
      .eq("id", listing_id);

    // Award XP for placing a bid
    await adminClient.from("xp_events").insert({
      user_id: user.id,
      event_type: "place_bid",
      xp_amount: XP_AWARDS.PLACE_BID,
      description: `Placed bid on "${listing.title}"`,
      reference_id: listing_id,
    });

    // Update user XP
    const { data: bidderProfile } = await adminClient
      .from("users")
      .select("xp, tier")
      .eq("id", user.id)
      .single();

    if (bidderProfile) {
      const newXp = bidderProfile.xp + XP_AWARDS.PLACE_BID;

      // Check for tier upgrade
      let newTier = bidderProfile.tier;
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
      message: "Bid placed successfully",
      current_bid: newVisibleBid,
      bid_count: listing.bid_count + 1,
      is_winning: newBidderId === user.id,
      your_max_bid: maxBidAmount,
      auction_end: updateData.auction_end ?? listing.auction_end,
    });
  } catch (err) {
    console.error("POST /api/bids error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
