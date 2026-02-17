import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const status = searchParams.get("status"); // "active" | "won" | "lost" | "all"
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Fetch all bids by this user with listing details
    let query = supabase
      .from("bids")
      .select(
        "*, listing:listings(*, listing_images(*), category:categories(*))",
        { count: "exact" }
      )
      .eq("bidder_id", user.id)
      .order("created_at", { ascending: false });

    // Filter by bid status
    if (status === "active") {
      // Bids on active listings where this bidder is winning
      query = query.eq("is_winning", true);
    } else if (status === "won") {
      query = query.eq("is_winning", true);
    } else if (status === "lost") {
      query = query.eq("is_winning", false);
    }

    query = query.range(from, to);

    const { data: bids, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // For "active" and "won" filtering, post-filter by listing status
    let filteredBids = (bids ?? []) as any[];
    if (status === "active") {
      filteredBids = filteredBids.filter(
        (bid) =>
          bid.listing &&
          typeof bid.listing === "object" &&
          "status" in bid.listing &&
          bid.listing.status === "active"
      );
    } else if (status === "won") {
      filteredBids = filteredBids.filter(
        (bid) =>
          bid.listing &&
          typeof bid.listing === "object" &&
          "status" in bid.listing &&
          (bid.listing.status === "ended" || bid.listing.status === "sold")
      );
    }

    return NextResponse.json({
      bids: filteredBids,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    console.error("GET /api/bids/my-bids error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
