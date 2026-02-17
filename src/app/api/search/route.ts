import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ listings: [], cards: [], users: [] });
    }

    const supabase = await createClient();
    const searchPattern = `%${query}%`;

    const [listingsRes, cardsRes, usersRes] = await Promise.all([
      supabase
        .from("listings")
        .select("id, title, listing_type, current_bid, buy_now_price, status, listing_images(image_url, is_primary)")
        .eq("status", "active")
        .ilike("title", searchPattern)
        .limit(5),
      supabase
        .from("pokemon_cards")
        .select("id, name, number, rarity, image_small, pokemon_sets(name)")
        .ilike("name", searchPattern)
        .limit(5),
      supabase
        .from("users")
        .select("username, display_name, avatar_url, tier")
        .or(`username.ilike.${searchPattern},display_name.ilike.${searchPattern}`)
        .limit(5),
    ]);

    return NextResponse.json({
      listings: listingsRes.data || [],
      cards: cardsRes.data || [],
      users: usersRes.data || [],
    });
  } catch {
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
