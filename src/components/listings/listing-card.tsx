"use client";

import Link from "next/link";
import Image from "next/image";
import { Gavel, Tag } from "lucide-react";
import { AuctionTimer } from "@/components/ui/auction-timer";

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    listing_type: string;
    current_bid: number;
    starting_price: number | null;
    buy_now_price: number | null;
    bid_count: number;
    auction_end: string | null;
    status: string;
    listing_images: { image_url: string; is_primary: boolean }[];
    categories: { display_name: string } | null;
  };
}

export function ListingCard({ listing }: ListingCardProps) {
  const primaryImage = listing.listing_images?.find((img) => img.is_primary);
  const imageUrl = primaryImage?.image_url || listing.listing_images?.[0]?.image_url;

  const isAuction =
    listing.listing_type === "auction" ||
    listing.listing_type === "auction_with_buy_now";

  const displayPrice = isAuction
    ? listing.current_bid > 0
      ? listing.current_bid
      : listing.starting_price
    : listing.buy_now_price;

  return (
    <Link
      href={`/listing/${listing.id}`}
      className="card-holo shine-sweep group relative overflow-hidden rounded-2xl border border-border bg-surface transition-all duration-300 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/5 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-background/50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listing.title}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-110"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Tag className="h-12 w-12 text-border-light" />
          </div>
        )}

        {/* Badge */}
        {listing.listing_type === "buy_now" ? (
          <span className="tag-buynow absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm">
            Buy Now
          </span>
        ) : (
          <span className="tag-auction absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-sm">
            Auction
          </span>
        )}

        {/* Hover overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {listing.categories?.display_name}
        </p>
        <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug text-foreground">
          {listing.title}
        </h3>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-lg font-extrabold text-neon-gold">
              &euro;{displayPrice?.toFixed(2)}
            </p>
            {isAuction && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                <Gavel className="h-3 w-3" />
                {listing.bid_count} bid{listing.bid_count !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {isAuction && listing.auction_end && (
            <AuctionTimer endTime={listing.auction_end} compact />
          )}
        </div>
      </div>
    </Link>
  );
}
