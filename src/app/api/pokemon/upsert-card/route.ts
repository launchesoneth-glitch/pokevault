import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { card } = body;

    if (!card || !card.external_id || !card.name) {
      return NextResponse.json({ error: "Missing card data" }, { status: 400 });
    }

    // 1. Upsert the set if present
    let setId: string | null = null;
    if (card.set?.external_id) {
      const { data: existingSet } = await supabase
        .from("pokemon_sets")
        .select("id")
        .eq("external_id", card.set.external_id)
        .single();

      if (existingSet) {
        setId = existingSet.id;
      } else {
        const { data: newSet, error: setError } = await supabase
          .from("pokemon_sets")
          .insert({
            external_id: card.set.external_id,
            name: card.set.name,
            series: card.set.series || null,
            release_date: card.set.release_date || null,
            total_cards: card.set.total_cards || null,
            logo_url: card.set.logo_url || null,
            symbol_url: card.set.symbol_url || null,
          })
          .select("id")
          .single();

        if (setError) {
          // Race condition: another request inserted it
          const { data: raceSet } = await supabase
            .from("pokemon_sets")
            .select("id")
            .eq("external_id", card.set.external_id)
            .single();
          setId = raceSet?.id ?? null;
        } else {
          setId = newSet.id;
        }
      }
    }

    // 2. Upsert the card
    const { data: existingCard } = await supabase
      .from("pokemon_cards")
      .select("id")
      .eq("external_id", card.external_id)
      .single();

    if (existingCard) {
      return NextResponse.json({ pokemon_card_id: existingCard.id });
    }

    const { data: newCard, error: cardError } = await supabase
      .from("pokemon_cards")
      .insert({
        external_id: card.external_id,
        set_id: setId,
        name: card.name,
        number: card.number || null,
        rarity: card.rarity || null,
        supertype: card.supertype || null,
        subtypes: card.subtypes || null,
        hp: card.hp || null,
        types: card.types || null,
        image_small: card.image_small || null,
        image_large: card.image_large || null,
        artist: card.artist || null,
      })
      .select("id")
      .single();

    if (cardError) {
      // Race condition fallback
      const { data: raceCard } = await supabase
        .from("pokemon_cards")
        .select("id")
        .eq("external_id", card.external_id)
        .single();

      if (raceCard) {
        return NextResponse.json({ pokemon_card_id: raceCard.id });
      }
      return NextResponse.json({ error: cardError.message }, { status: 500 });
    }

    return NextResponse.json({ pokemon_card_id: newCard.id });
  } catch (err) {
    console.error("POST /api/pokemon/upsert-card error:", err);
    return NextResponse.json({ error: "Failed to save card" }, { status: 500 });
  }
}
