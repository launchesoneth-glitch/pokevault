import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/listings/listing-card";
import { ChevronLeft, ChevronRight, Gavel } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Active Auctions",
  description:
    "Browse active Pokemon TCG auctions ending soon. Place your bids on raw singles, graded cards, and sealed products.",
};

const ITEMS_PER_PAGE = 24;

interface AuctionsPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
  }>;
}

export default async function AuctionsPage({
  searchParams,
}: AuctionsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  let query = supabase
    .from("listings")
    .select(
      `
      id,
      title,
      listing_type,
      current_bid,
      starting_price,
      buy_now_price,
      bid_count,
      auction_end,
      status,
      created_at,
      listing_images (image_url, is_primary),
      categories:category_id (display_name)
    `,
      { count: "exact" }
    )
    .eq("status", "active")
    .in("listing_type", ["auction", "auction_with_buy_now"])
    .gt("auction_end", new Date().toISOString());

  // Apply sorting - default to ending soonest
  switch (params.sort) {
    case "newly_listed":
      query = query.order("created_at", { ascending: false });
      break;
    case "price_low":
      query = query.order("current_bid", { ascending: true });
      break;
    case "price_high":
      query = query.order("current_bid", { ascending: false });
      break;
    case "most_bids":
      query = query.order("bid_count", { ascending: false });
      break;
    case "ending_soon":
    default:
      query = query.order("auction_end", { ascending: true });
      break;
  }

  query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

  const { data: listings, count } = await query;

  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0;
  const totalResults = count ?? 0;

  function buildPageUrl(page: number): string {
    const urlParams = new URLSearchParams();
    if (params.sort) urlParams.set("sort", params.sort);
    urlParams.set("page", page.toString());
    return `/browse/auctions?${urlParams.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <Gavel className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Active Auctions
            </h1>
            <p className="mt-1 text-muted">
              {totalResults} active auction{totalResults !== 1 ? "s" : ""}{" "}
              ending soon
            </p>
          </div>
        </div>
      </div>

      {/* Sort Bar */}
      <div className="mb-6 flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/browse" className="text-muted transition-colors hover:text-accent">
            Browse
          </Link>
          <span className="text-muted">/</span>
          <span className="font-medium text-foreground">Auctions</span>
        </nav>

        <select
          defaultValue={params.sort || "ending_soon"}
          onChange={(e) => {
            const url = new URL(window.location.href);
            url.searchParams.set("sort", e.target.value);
            url.searchParams.delete("page");
            window.location.href = url.toString();
          }}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="ending_soon">Ending Soon</option>
          <option value="newly_listed">Newly Listed</option>
          <option value="price_low">Price: Low to High</option>
          <option value="price_high">Price: High to Low</option>
          <option value="most_bids">Most Bids</option>
        </select>
      </div>

      {/* Listing Grid */}
      {listings && listings.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={{
                ...listing,
                listing_images: listing.listing_images ?? [],
                categories: listing.categories as { display_name: string } | null,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface px-6 py-16 text-center">
          <Gavel className="mb-4 h-12 w-12 text-muted" />
          <h3 className="text-lg font-semibold text-foreground">
            No active auctions
          </h3>
          <p className="mt-2 max-w-sm text-sm text-muted">
            There are no active auctions at the moment. Check back soon or
            browse our buy-now listings.
          </p>
          <Link
            href="/browse/buy-now"
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent/90"
          >
            Browse Buy Now
          </Link>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav
          className="mt-8 flex items-center justify-center gap-2"
          aria-label="Pagination"
        >
          {currentPage > 1 ? (
            <Link
              href={buildPageUrl(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm font-medium text-muted">
              <ChevronLeft className="h-4 w-4" />
              Previous
            </span>
          )}

          <span className="px-3 text-sm text-muted">
            Page {currentPage} of {totalPages}
          </span>

          {currentPage < totalPages ? (
            <Link
              href={buildPageUrl(currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm font-medium text-muted">
              Next
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
