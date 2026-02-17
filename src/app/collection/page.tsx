import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Plus, Search } from "lucide-react";

export const metadata = { title: "My Collection" };

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/collection");

  // Fetch collection items with card details
  const { data: items } = await supabase
    .from("collection_items")
    .select("*, pokemon_cards(*, pokemon_sets(name, logo_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch set completion stats
  const { data: sets } = await supabase
    .from("pokemon_sets")
    .select("id, name, total_cards, logo_url, symbol_url")
    .order("release_date", { ascending: false });

  const ownedBySet: Record<string, number> = {};
  items?.forEach((item) => {
    const setId = (item.pokemon_cards as { set_id: string | null })?.set_id;
    if (setId) {
      ownedBySet[setId] = (ownedBySet[setId] || 0) + 1;
    }
  });

  const totalOwned = items?.filter((i) => i.status === "own").length || 0;
  const totalWant = items?.filter((i) => i.status === "want").length || 0;
  const totalTrade = items?.filter((i) => i.status === "for_trade").length || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Collection</h1>
          <p className="mt-1 text-sm text-muted">
            Track your Pokemon cards and set completion
          </p>
        </div>
        <Link
          href="/browse/sets"
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          Add Cards
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-accent">{totalOwned}</p>
          <p className="text-xs text-muted">Owned</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-info">{totalWant}</p>
          <p className="text-xs text-muted">Want List</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-2xl font-bold text-success">{totalTrade}</p>
          <p className="text-xs text-muted">For Trade</p>
        </div>
      </div>

      {/* Set Completion */}
      {sets && sets.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">
            Set Completion
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sets
              .filter((s) => ownedBySet[s.id])
              .map((set) => {
                const owned = ownedBySet[set.id] || 0;
                const total = set.total_cards || 1;
                const pct = Math.round((owned / total) * 100);
                return (
                  <Link
                    key={set.id}
                    href={`/collection/${set.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-accent/50"
                  >
                    {set.logo_url && (
                      <img
                        src={set.logo_url}
                        alt={set.name}
                        className="h-8 w-auto"
                      />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {set.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-border">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted">
                          {owned}/{total}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      )}

      {/* Collection Grid */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">All Cards</h2>
        {items && items.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => {
              const card = item.pokemon_cards as {
                name: string;
                image_small: string | null;
                number: string | null;
                rarity: string | null;
                pokemon_sets: { name: string } | null;
              } | null;
              return (
                <div
                  key={`${item.user_id}-${item.pokemon_card_id}`}
                  className="group overflow-hidden rounded-lg border border-border bg-surface"
                >
                  <div className="relative aspect-[2.5/3.5] bg-background">
                    {card?.image_small ? (
                      <img
                        src={card.image_small}
                        alt={card.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted">
                        <BookOpen className="h-8 w-8" />
                      </div>
                    )}
                    <span
                      className={`absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        item.status === "own"
                          ? "bg-accent/90 text-background"
                          : item.status === "want"
                            ? "bg-info/90 text-white"
                            : "bg-success/90 text-white"
                      }`}
                    >
                      {item.status === "own"
                        ? "Own"
                        : item.status === "want"
                          ? "Want"
                          : "Trade"}
                    </span>
                  </div>
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-foreground">
                      {card?.name}
                    </p>
                    <p className="truncate text-[10px] text-muted">
                      {card?.pokemon_sets?.name} #{card?.number}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted/50" />
            <p className="mt-3 text-muted">Your collection is empty</p>
            <Link
              href="/browse/sets"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent-hover"
            >
              Browse Sets
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
