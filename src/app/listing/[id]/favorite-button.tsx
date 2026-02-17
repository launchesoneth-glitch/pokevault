"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface FavoriteButtonProps {
  listingId: string;
  initialFavorited: boolean;
  favoriteCount: number;
}

export function FavoriteButton({
  listingId,
  initialFavorited,
  favoriteCount,
}: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [count, setCount] = useState(favoriteCount);
  const [isPending, startTransition] = useTransition();

  async function toggleFavorite() {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to login if not authenticated
      window.location.href = "/auth/login?redirect=" + encodeURIComponent(window.location.pathname);
      return;
    }

    startTransition(async () => {
      if (isFavorited) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);

        if (!error) {
          setIsFavorited(false);
          setCount((prev) => Math.max(0, prev - 1));
        }
      } else {
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          listing_id: listingId,
        });

        if (!error) {
          setIsFavorited(true);
          setCount((prev) => prev + 1);
        }
      }
    });
  }

  return (
    <button
      onClick={toggleFavorite}
      disabled={isPending}
      className="group flex shrink-0 flex-col items-center gap-1 transition-colors disabled:opacity-50"
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
          isFavorited
            ? "border-pokered bg-pokered/10 text-pokered"
            : "border-border bg-surface text-muted hover:border-pokered/50 hover:text-pokered"
        }`}
      >
        <Heart
          className={`h-5 w-5 ${isFavorited ? "fill-current" : ""}`}
        />
      </div>
      <span className="text-xs text-muted">{count}</span>
    </button>
  );
}
