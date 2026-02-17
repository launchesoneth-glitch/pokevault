import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ListingCard } from "@/components/listings/listing-card";
import { BrowseFilters } from "@/components/browse/browse-filters";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Browse Listings",
  description:
    "Browse all Pokemon TCG listings. Find raw singles, graded cards, and sealed products at auction or buy now prices.",
};

const ITEMS_PER_PAGE = 24;

interface BrowsePageProps {
  searchParams: Promise<{
    category?: string;
    type?: string;
    minPrice?: string;
    maxPrice?: string;
    condition?: string;
    gradingCompany?: string;
    sort?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const currentPage = Math.max(1, parseInt(params.page || "1", 10));
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  // Build query
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
      condition,
      grading_company,
      created_at,
      listing_images (image_url, is_primary),
      categories:category_id (display_name)
    `,
      { count: "exact" }
    )
    .eq("status", "active");

  // Apply category filter
  if (params.category) {
    const categories = params.category.split(",");
    const categoryNameMap: Record<string, string> = {
      raw_singles: "raw_singles",
      graded_cards: "graded_cards",
      sealed_product: "sealed_product",
    };
    const validCategories = categories
      .map((c) => categoryNameMap[c])
      .filter(Boolean);
    if (validCategories.length > 0) {
      // Join through categories table by name
      const { data: categoryRows } = await supabase
        .from("categories")
        .select("id")
        .in("name", validCategories);
      if (categoryRows && categoryRows.length > 0) {
        query = query.in(
          "category_id",
          categoryRows.map((c) => c.id)
        );
      }
    }
  }

  // Apply listing type filter
  if (params.type) {
    if (params.type === "auction") {
      query = query.in("listing_type", ["auction", "auction_with_buy_now"]);
    } else if (params.type === "buy_now") {
      query = query.in("listing_type", ["buy_now", "auction_with_buy_now"]);
    }
  }

  // Apply price range filter
  if (params.minPrice) {
    const min = parseFloat(params.minPrice);
    if (!isNaN(min)) {
      query = query.gte("current_bid", min);
    }
  }
  if (params.maxPrice) {
    const max = parseFloat(params.maxPrice);
    if (!isNaN(max)) {
      query = query.lte("current_bid", max);
    }
  }

  // Apply condition filter
  if (params.condition) {
    query = query.eq("condition", params.condition as any);
  }

  // Apply grading company filter
  if (params.gradingCompany) {
    const companies = params.gradingCompany.split(",");
    query = query.in("grading_company", companies as any);
  }

  // Apply search filter
  if (params.search) {
    query = query.ilike("title", `%${params.search}%`);
  }

  // Apply sorting
  switch (params.sort) {
    case "ending_soon":
      query = query
        .not("auction_end", "is", null)
        .order("auction_end", { ascending: true });
      break;
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
    default:
      query = query.order("created_at", { ascending: false });
      break;
  }

  // Apply pagination
  query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

  const { data: listings, count } = await query;

  const totalPages = count ? Math.ceil(count / ITEMS_PER_PAGE) : 0;
  const totalResults = count ?? 0;

  // Build URL for pagination links
  function buildPageUrl(page: number): string {
    const urlParams = new URLSearchParams();
    if (params.category) urlParams.set("category", params.category);
    if (params.type) urlParams.set("type", params.type);
    if (params.minPrice) urlParams.set("minPrice", params.minPrice);
    if (params.maxPrice) urlParams.set("maxPrice", params.maxPrice);
    if (params.condition) urlParams.set("condition", params.condition);
    if (params.gradingCompany) urlParams.set("gradingCompany", params.gradingCompany);
    if (params.sort) urlParams.set("sort", params.sort);
    if (params.search) urlParams.set("search", params.search);
    urlParams.set("page", page.toString());
    return `/browse?${urlParams.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Browse Listings</h1>
        <p className="mt-2 text-muted">
          Discover Pokemon TCG cards and sealed products from trusted consigners.
        </p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Sidebar Filters */}
        <aside className="w-full shrink-0 lg:w-72">
          <BrowseFilters />
        </aside>

        {/* Main Content */}
        <div className="min-w-0 flex-1">
          {/* Results Header */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-muted">
              {totalResults > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {offset + 1}
                  </span>
                  {" - "}
                  <span className="font-medium text-foreground">
                    {Math.min(offset + ITEMS_PER_PAGE, totalResults)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground">
                    {totalResults}
                  </span>{" "}
                  results
                </>
              ) : (
                "No results found"
              )}
            </p>
          </div>

          {/* Listing Grid */}
          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              <Search className="mb-4 h-12 w-12 text-muted" />
              <h3 className="text-lg font-semibold text-foreground">
                No listings found
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted">
                Try adjusting your filters or search terms to find what you are
                looking for.
              </p>
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

              <div className="flex items-center gap-1">
                {generatePageNumbers(currentPage, totalPages).map(
                  (page, index) =>
                    page === null ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-muted"
                      >
                        ...
                      </span>
                    ) : (
                      <Link
                        key={page}
                        href={buildPageUrl(page)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === currentPage
                            ? "bg-accent text-background"
                            : "border border-border bg-surface text-foreground hover:border-accent/50 hover:text-accent"
                        }`}
                      >
                        {page}
                      </Link>
                    )
                )}
              </div>

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
      </div>
    </div>
  );
}

/** Generate page numbers with ellipsis for pagination display. */
function generatePageNumbers(
  current: number,
  total: number
): (number | null)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | null)[] = [1];

  if (current > 3) {
    pages.push(null);
  }

  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);

  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push(null);
  }

  pages.push(total);

  return pages;
}
