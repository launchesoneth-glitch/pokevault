import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: profile } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch various stats in parallel
    const [
      activeListings,
      pendingConsignments,
      ordersToShip,
      totalUsers,
      recentOrders,
    ] = await Promise.all([
      supabase
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("consignments")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "shipped_to_us", "received"]),
      supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "paid"),
      supabase
        .from("users")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({
      stats: {
        activeListings: activeListings.count || 0,
        pendingConsignments: pendingConsignments.count || 0,
        ordersToShip: ordersToShip.count || 0,
        totalUsers: totalUsers.count || 0,
      },
      recentOrders: recentOrders.data || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
