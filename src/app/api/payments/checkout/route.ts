import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await request.json();

    const { data: order, error } = await supabase
      .from("orders")
      .select("*, listings(title)")
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.payment_status !== "pending") {
      return NextResponse.json(
        { error: "Order already processed" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("users")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await supabase
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // Get seller's connected account
    const { data: seller } = await supabase
      .from("users")
      .select("stripe_connect_account_id")
      .eq("id", order.seller_id)
      .single();

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card", "ideal", "bancontact", "sepa_debit"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: (order as Record<string, unknown>).listings
                ? ((order as Record<string, unknown>).listings as { title: string }).title
                : `Order ${order.order_number}`,
            },
            unit_amount: Math.round(order.total_amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/purchases?success=${orderId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/listing/${order.listing_id}`,
      metadata: {
        order_id: order.id,
        seller_id: order.seller_id,
      },
      ...(seller?.stripe_connect_account_id && {
        payment_intent_data: {
          transfer_data: {
            destination: seller.stripe_connect_account_id,
            amount: Math.round(order.seller_payout * 100),
          },
        },
      }),
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
