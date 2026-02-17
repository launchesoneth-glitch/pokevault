import { NextRequest, NextResponse } from "next/server";
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

    const { data, error } = await supabase
      .from("collection_items")
      .select("*, pokemon_cards(*, pokemon_sets(name))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pokemon_card_id, status = "own", quantity = 1, condition, notes } = body;

    if (!pokemon_card_id) {
      return NextResponse.json(
        { error: "pokemon_card_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("collection_items")
      .upsert(
        {
          user_id: user.id,
          pokemon_card_id,
          status,
          quantity,
          condition,
          notes,
        },
        { onConflict: "user_id,pokemon_card_id" }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: data }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Failed to add to collection" },
      { status: 500 }
    );
  }
}
