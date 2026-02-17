import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { OFFER_EXPIRY_HOURS } from "@/lib/constants";

type RouteParams = { params: Promise<{ id: string }> };

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

    const body = await request.json();
    const { action, counter_amount } = body;

    if (!action || !["accept", "reject", "counter"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be one of: accept, reject, counter" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Fetch the offer with listing details
    const { data: offer, error: offerError } = await adminClient
      .from("offers")
      .select("*, listing:listings(*)")
      .eq("id", id)
      .single();

    if (offerError || !offer) {
      return NextResponse.json(
        { error: "Offer not found" },
        { status: 404 }
      );
    }

    if (offer.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot ${action} an offer with status "${offer.status}"` },
        { status: 400 }
      );
    }

    // Check the offer has not expired
    if (new Date(offer.expires_at) <= new Date()) {
      await adminClient
        .from("offers")
        .update({ status: "expired" })
        .eq("id", id);

      return NextResponse.json(
        { error: "This offer has expired" },
        { status: 400 }
      );
    }

    // Verify the current user is the seller (listing owner)
    const listing = offer.listing as Record<string, unknown>;
    if (!listing || user.id !== listing.seller_id) {
      return NextResponse.json(
        { error: "Only the seller can respond to offers" },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    if (action === "accept") {
      // Update offer status
      const { error: updateOfferError } = await adminClient
        .from("offers")
        .update({
          status: "accepted",
          responded_at: now,
        })
        .eq("id", id);

      if (updateOfferError) {
        return NextResponse.json(
          { error: "Failed to accept offer" },
          { status: 500 }
        );
      }

      // Update listing status to sold
      await adminClient
        .from("listings")
        .update({
          status: "sold",
          final_sale_price: offer.amount,
          updated_at: now,
        })
        .eq("id", offer.listing_id);

      // Reject all other pending offers on this listing
      await adminClient
        .from("offers")
        .update({
          status: "rejected",
          responded_at: now,
        })
        .eq("listing_id", offer.listing_id)
        .eq("status", "pending")
        .neq("id", id);

      // Calculate commission
      const commissionRate = (listing.commission_rate as number) ?? 10;
      const salePrice = offer.amount;
      const commissionAmount = salePrice * (commissionRate / 100);
      const sellerPayout = salePrice - commissionAmount;

      // Create order
      const orderNumber = `PV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { data: order, error: orderError } = await adminClient
        .from("orders")
        .insert({
          order_number: orderNumber,
          listing_id: offer.listing_id,
          buyer_id: offer.buyer_id,
          seller_id: listing.seller_id as string,
          sale_price: salePrice,
          buyer_premium: 0,
          shipping_cost: 0,
          total_amount: salePrice,
          commission_amount: commissionAmount,
          seller_payout: sellerPayout,
          status: "pending",
          payment_status: "pending",
          payout_status: "pending",
        })
        .select()
        .single();

      if (orderError) {
        console.error("Error creating order:", orderError);
      }

      // Notify the buyer
      await adminClient.from("notifications").insert({
        user_id: offer.buyer_id,
        type: "offer_accepted",
        title: "Offer Accepted!",
        message: `Your offer of $${offer.amount.toFixed(2)} on "${listing.title}" has been accepted.`,
        data: {
          offer_id: id,
          listing_id: offer.listing_id,
          order_id: order?.id,
        },
      });

      return NextResponse.json({
        message: "Offer accepted successfully",
        offer: { ...offer, status: "accepted", responded_at: now },
        order,
      });
    }

    if (action === "reject") {
      const { error: updateError } = await adminClient
        .from("offers")
        .update({
          status: "rejected",
          responded_at: now,
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to reject offer" },
          { status: 500 }
        );
      }

      // Notify the buyer
      await adminClient.from("notifications").insert({
        user_id: offer.buyer_id,
        type: "offer_rejected",
        title: "Offer Rejected",
        message: `Your offer of $${offer.amount.toFixed(2)} on "${listing.title}" has been rejected.`,
        data: {
          offer_id: id,
          listing_id: offer.listing_id,
        },
      });

      return NextResponse.json({
        message: "Offer rejected",
        offer: { ...offer, status: "rejected", responded_at: now },
      });
    }

    if (action === "counter") {
      if (counter_amount == null) {
        return NextResponse.json(
          { error: "counter_amount is required for counter offers" },
          { status: 400 }
        );
      }

      const counterValue = parseFloat(counter_amount);
      if (isNaN(counterValue) || counterValue <= 0) {
        return NextResponse.json(
          { error: "counter_amount must be a positive number" },
          { status: 400 }
        );
      }

      // Calculate new expiry for the counter offer
      const newExpiry = new Date();
      newExpiry.setHours(newExpiry.getHours() + OFFER_EXPIRY_HOURS);

      const { error: updateError } = await adminClient
        .from("offers")
        .update({
          status: "countered",
          counter_amount: counterValue,
          responded_at: now,
          expires_at: newExpiry.toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        return NextResponse.json(
          { error: "Failed to counter offer" },
          { status: 500 }
        );
      }

      // Notify the buyer
      await adminClient.from("notifications").insert({
        user_id: offer.buyer_id,
        type: "offer_countered",
        title: "Counter Offer Received",
        message: `The seller countered your offer on "${listing.title}" with $${counterValue.toFixed(2)}.`,
        data: {
          offer_id: id,
          listing_id: offer.listing_id,
          counter_amount: counterValue,
        },
      });

      return NextResponse.json({
        message: "Counter offer sent",
        offer: {
          ...offer,
          status: "countered",
          counter_amount: counterValue,
          responded_at: now,
          expires_at: newExpiry.toISOString(),
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("PUT /api/offers/[id] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
