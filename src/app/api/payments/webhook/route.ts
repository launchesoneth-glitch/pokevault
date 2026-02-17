import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.order_id;
      if (orderId) {
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            stripe_payment_intent_id: session.payment_intent as string,
            paid_at: new Date().toISOString(),
            status: "paid",
          })
          .eq("id", orderId);

        // Update listing status
        const { data: order } = await supabase
          .from("orders")
          .select("listing_id, buyer_id")
          .eq("id", orderId)
          .single();

        if (order) {
          await supabase
            .from("listings")
            .update({ status: "sold" })
            .eq("id", order.listing_id);

          // Notify seller
          const sellerId = session.metadata?.seller_id;
          if (sellerId) {
            await supabase.from("notifications").insert({
              user_id: sellerId,
              type: "sale_completed",
              title: "Item Sold!",
              message: "Your consigned item has been sold. We will ship it soon.",
              data: { order_id: orderId },
            });
          }
        }
      }
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { data: orders } = await supabase
        .from("orders")
        .select("id, buyer_id")
        .eq("stripe_payment_intent_id", paymentIntent.id);

      if (orders && orders.length > 0) {
        const order = orders[0];
        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", order.id);

        await supabase.from("notifications").insert({
          user_id: order.buyer_id,
          type: "payment_failed",
          title: "Payment Failed",
          message: "Your payment could not be processed. Please try again.",
          data: { order_id: order.id },
        });
      }
      break;
    }

    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      if (account.metadata?.user_id) {
        await supabase
          .from("users")
          .update({ stripe_connect_account_id: account.id })
          .eq("id", account.metadata.user_id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
