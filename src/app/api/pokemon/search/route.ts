import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ cards: [] });
    }

    const apiUrl = `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(query)}*&pageSize=10&select=id,name,set,number,images,rarity,supertype,subtypes,hp,types,artist`;

    const headers: HeadersInit = {};
    if (process.env.POKEMON_TCG_API_KEY && process.env.POKEMON_TCG_API_KEY !== "xxx") {
      headers["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
    }

    const response = await fetch(apiUrl, { headers });
    const json = await response.json();

    const cards = (json.data ?? []).map((card: any) => ({
      external_id: card.id,
      name: card.name,
      number: card.number ?? null,
      rarity: card.rarity ?? null,
      supertype: card.supertype ?? null,
      subtypes: card.subtypes ?? null,
      hp: card.hp ?? null,
      types: card.types ?? null,
      artist: card.artist ?? null,
      image_small: card.images?.small ?? null,
      image_large: card.images?.large ?? null,
      set: {
        external_id: card.set?.id ?? null,
        name: card.set?.name ?? null,
        series: card.set?.series ?? null,
        release_date: card.set?.releaseDate ?? null,
        total_cards: card.set?.total ?? null,
        logo_url: card.set?.images?.logo ?? null,
        symbol_url: card.set?.images?.symbol ?? null,
      },
    }));

    return NextResponse.json({ cards });
  } catch (err) {
    console.error("GET /api/pokemon/search error:", err);
    return NextResponse.json({ error: "Failed to search cards" }, { status: 500 });
  }
}
