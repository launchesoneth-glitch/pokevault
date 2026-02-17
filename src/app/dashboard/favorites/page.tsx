import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";
import { Metadata } from "next";

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

export const metadata: Metadata = {
  title: "Favorites | PokeVault",
  description: "Your saved listings on PokeVault.",
};

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function FavoritesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  /* ---- Fetch favorites with joined listing + images --------------------- */

  const { data: favoritesRaw, error } = await supabase
    .from("favorites")
    .select(
      `
      id,
      created_at,
      listings (
        id,
        title,
        price,
        status,
        condition,
        created_at,
        seller_id,
        users:seller_id (
          username,
          display_name,
          avatar_url
        ),
        listing_images (
          url,
          position
        )
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
    const favorites = (favoritesRaw ?? []) as any[];

  /* ---- Filter out any favorites whose listings were deleted/null --------- */

  const validFavorites = (favorites ?? []).filter(
    (fav) => fav.listings !== null,
  );

  /* ---- Render ----------------------------------------------------------- */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Favorites</h1>
        <p className="mt-1 text-sm text-muted">
          Listings you&apos;ve saved for later. {validFavorites.length > 0 && (
            <span className="text-foreground font-medium">
              {validFavorites.length} item{validFavorites.length !== 1 && "s"}
            </span>
          )}
        </p>
      </div>

      {validFavorites.length > 0 ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {validFavorites.map((fav) => {
            const listing = fav.listings as {
              id: string;
              title: string;
              current_bid: number | null;
              status: string;
              condition: string | null;
              created_at: string;
              seller_id: string;
              users: {
                username: string;
                display_name: string | null;
                avatar_url: string | null;
              } | null;
              listing_images: { url: string; position: number }[];
            };

            // Sort images by position and pick the first as thumbnail
            const images = [...(listing.listing_images ?? [])].sort(
              (a, b) => a.position - b.position,
            );

            return (
              <ListingCard
                key={fav.listing_id}
                listing={{} as any}
              />
            );
          })}
        </div>
      ) : (
        /* ---- Empty state ------------------------------------------------ */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 py-24">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
            <Heart className="h-8 w-8 text-muted/60" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            No favorites yet
          </h2>
          <p className="mt-1 max-w-xs text-center text-sm text-muted">
            Browse the marketplace and tap the heart icon on any listing to save
            it here for later.
          </p>
          <a
            href="/browse"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent/90"
          >
            Browse Listings
          </a>
        </div>
      )}
    </div>
  );
}
