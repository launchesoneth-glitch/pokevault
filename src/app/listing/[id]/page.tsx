import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Eye,
  Heart,
  Award,
  Globe,
  Tag,
  User,
  Star,
  ChevronRight,
  Gavel,
  ShoppingCart,
  MessageSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CONDITIONS, GRADING_COMPANIES, CARD_LANGUAGES } from "@/lib/constants";
import { AuctionTimer } from "@/components/ui/auction-timer";
import { BidForm } from "@/components/listings/bid-form";
import { ImageGallery } from "@/components/listings/image-gallery";
import { FavoriteButton } from "./favorite-button";

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ListingPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("title, description")
    .eq("id", id)
    .single();

  if (!listing) {
    return { title: "Listing Not Found" };
  }

  return {
    title: listing.title,
    description:
      listing.description?.slice(0, 160) ||
      `View details for ${listing.title} on PokeVault.`,
  };
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Fetch listing with related data
  const { data: listing, error } = await supabase
    .from("listings")
    .select(
      `
      *,
      listing_images (id, image_url, is_primary, sort_order),
      categories:category_id (id, name, display_name),
      pokemon_cards:pokemon_card_id (
        id,
        name,
        number,
        rarity,
        supertype,
        subtypes,
        hp,
        types,
        artist,
        image_small,
        image_large,
        pokemon_sets:set_id (name, series)
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !listing) {
    notFound();
  }

  // Fetch seller info
  const { data: seller } = await supabase
    .from("users")
    .select(
      "id, username, display_name, avatar_url, tier, is_verified, total_sales_volume, total_transactions, created_at"
    )
    .eq("id", listing.seller_id)
    .single();

  // Fetch bid history for auctions
  let bidHistory: {
    id: string;
    amount: number;
    created_at: string;
    bidder: { username: string } | null;
  }[] = [];

  const isAuction =
    listing.listing_type === "auction" ||
    listing.listing_type === "auction_with_buy_now";

  if (isAuction) {
    const { data: bids } = await supabase
      .from("bids")
      .select("id, amount, created_at, bidder:bidder_id (username)")
      .eq("listing_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    bidHistory = (bids ?? []).map((bid) => ({
      ...bid,
      bidder: bid.bidder as { username: string } | null,
    }));
  }

  // Increment view count (fire-and-forget)
  supabase
    .from("listings")
    .update({ view_count: listing.view_count + 1 })
    .eq("id", id)
    .then();

  // Check if current user has favorited
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isFavorited = false;
  if (user) {
    const { data: favorite } = await supabase
      .from("favorites")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("listing_id", id)
      .maybeSingle();
    isFavorited = !!favorite;
  }

  // Sort images: primary first, then by sort_order
  const sortedImages = [...(listing.listing_images ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1;
    if (!a.is_primary && b.is_primary) return 1;
    return a.sort_order - b.sort_order;
  });

  const conditionLabel =
    CONDITIONS.find((c) => c.value === listing.condition)?.label ?? null;
  const gradingLabel =
    GRADING_COMPANIES.find((g) => g.value === listing.grading_company)?.label ??
    null;
  const languageLabel =
    CARD_LANGUAGES.find((l) => l.value === listing.language)?.label ??
    listing.language;

  const pokemonCard = listing.pokemon_cards as {
    id: string;
    name: string;
    number: string | null;
    rarity: string | null;
    supertype: string | null;
    subtypes: string[] | null;
    hp: string | null;
    types: string[] | null;
    artist: string | null;
    image_small: string | null;
    image_large: string | null;
    pokemon_sets: { name: string; series: string | null } | null;
  } | null;

  const category = listing.categories as {
    id: string;
    name: string;
    display_name: string;
  } | null;

  const isEnded =
    listing.status !== "active" ||
    (listing.auction_end &&
      new Date(listing.auction_end).getTime() < Date.now());

  const displayPrice = isAuction
    ? listing.current_bid > 0
      ? listing.current_bid
      : listing.starting_price
    : listing.buy_now_price;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted">
        <Link href="/browse" className="transition-colors hover:text-accent">
          Browse
        </Link>
        <ChevronRight className="h-3 w-3" />
        {category && (
          <>
            <Link
              href={`/browse?category=${category.name}`}
              className="transition-colors hover:text-accent"
            >
              {category.display_name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="truncate text-foreground">{listing.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column: Images */}
        <div>
          <ImageGallery
            images={sortedImages.map((img) => ({
              image_url: img.image_url,
              is_primary: img.is_primary,
              sort_order: img.sort_order,
            }))}
          />
        </div>

        {/* Right Column: Details */}
        <div className="space-y-6">
          {/* Title & Quick Info */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {category && (
                  <p className="mb-1 text-sm font-medium text-accent">
                    {category.display_name}
                  </p>
                )}
                <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  {listing.title}
                </h1>
              </div>
              <FavoriteButton
                listingId={listing.id}
                initialFavorited={isFavorited}
                favoriteCount={listing.favorite_count}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {listing.view_count} views
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {listing.favorite_count} favorites
              </span>
              {isAuction && (
                <span className="flex items-center gap-1">
                  <Gavel className="h-4 w-4" />
                  {listing.bid_count} bid{listing.bid_count !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Price & Action Section */}
          <div className="rounded-xl border border-border bg-surface p-5">
            {isAuction ? (
              /* Auction Section */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">
                      {listing.bid_count > 0 ? "Current Bid" : "Starting Price"}
                    </p>
                    <p className="text-3xl font-bold text-accent">
                      &euro;{displayPrice?.toFixed(2)}
                    </p>
                    {listing.bid_count > 0 && (
                      <p className="mt-0.5 text-xs text-muted">
                        {listing.bid_count} bid
                        {listing.bid_count !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  {listing.auction_end && (
                    <div className="text-right">
                      <p className="mb-1 text-sm text-muted">Time Left</p>
                      <AuctionTimer endTime={listing.auction_end} />
                    </div>
                  )}
                </div>

                {listing.reserve_price !== null &&
                  listing.current_bid < listing.reserve_price && (
                    <p className="text-sm font-medium text-pokered">
                      Reserve not met
                    </p>
                  )}

                {listing.listing_type === "auction_with_buy_now" &&
                  listing.buy_now_price && (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
                      <div>
                        <p className="text-xs text-muted">Buy Now Price</p>
                        <p className="text-lg font-bold text-foreground">
                          &euro;{listing.buy_now_price.toFixed(2)}
                        </p>
                      </div>
                      <button
                        className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!!isEnded}
                      >
                        Buy Now
                      </button>
                    </div>
                  )}

                {!isEnded && (
                  <BidForm
                    listingId={listing.id}
                    currentBid={listing.current_bid}
                    startingPrice={listing.starting_price}
                  />
                )}

                {isEnded && (
                  <div className="rounded-lg border border-border bg-background px-4 py-3 text-center text-sm font-medium text-muted">
                    This auction has ended
                  </div>
                )}
              </div>
            ) : (
              /* Buy Now Section */
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted">Price</p>
                  <p className="text-3xl font-bold text-accent">
                    &euro;{listing.buy_now_price?.toFixed(2)}
                  </p>
                </div>

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-semibold text-background transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!!isEnded}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Buy Now
                </button>

                {listing.offers_enabled && !isEnded && (
                  <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-accent bg-transparent px-6 py-3 text-base font-semibold text-accent transition-colors hover:bg-accent/10">
                    <MessageSquare className="h-5 w-5" />
                    Make Offer
                    {listing.minimum_offer && (
                      <span className="text-sm font-normal text-muted">
                        (min &euro;{listing.minimum_offer.toFixed(2)})
                      </span>
                    )}
                  </button>
                )}

                {isEnded && (
                  <div className="rounded-lg border border-border bg-background px-4 py-3 text-center text-sm font-medium text-muted">
                    This listing is no longer available
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Item Details */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Item Details
            </h2>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {conditionLabel && (
                <>
                  <dt className="text-muted">Condition</dt>
                  <dd className="font-medium text-foreground">
                    {conditionLabel}
                  </dd>
                </>
              )}
              {languageLabel && (
                <>
                  <dt className="flex items-center gap-1 text-muted">
                    <Globe className="h-3.5 w-3.5" />
                    Language
                  </dt>
                  <dd className="font-medium text-foreground">
                    {languageLabel}
                  </dd>
                </>
              )}
              {gradingLabel && (
                <>
                  <dt className="flex items-center gap-1 text-muted">
                    <Shield className="h-3.5 w-3.5" />
                    Grading Company
                  </dt>
                  <dd className="font-medium text-foreground">
                    {gradingLabel}
                  </dd>
                </>
              )}
              {listing.grade !== null && (
                <>
                  <dt className="flex items-center gap-1 text-muted">
                    <Award className="h-3.5 w-3.5" />
                    Grade
                  </dt>
                  <dd className="font-medium text-foreground">
                    {listing.grade}
                  </dd>
                </>
              )}
              {listing.cert_number && (
                <>
                  <dt className="text-muted">Cert #</dt>
                  <dd className="font-medium text-foreground">
                    {listing.cert_number}
                  </dd>
                </>
              )}
              {pokemonCard?.rarity && (
                <>
                  <dt className="text-muted">Rarity</dt>
                  <dd className="font-medium text-foreground">
                    {pokemonCard.rarity}
                  </dd>
                </>
              )}
              {pokemonCard?.number && (
                <>
                  <dt className="text-muted">Card Number</dt>
                  <dd className="font-medium text-foreground">
                    {pokemonCard.number}
                  </dd>
                </>
              )}
              {pokemonCard?.pokemon_sets?.name && (
                <>
                  <dt className="text-muted">Set</dt>
                  <dd className="font-medium text-foreground">
                    {pokemonCard.pokemon_sets.name}
                    {pokemonCard.pokemon_sets.series && (
                      <span className="ml-1 text-xs text-muted">
                        ({pokemonCard.pokemon_sets.series})
                      </span>
                    )}
                  </dd>
                </>
              )}
              {pokemonCard?.artist && (
                <>
                  <dt className="text-muted">Artist</dt>
                  <dd className="font-medium text-foreground">
                    {pokemonCard.artist}
                  </dd>
                </>
              )}
            </dl>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-3 text-lg font-semibold text-foreground">
                Description
              </h2>
              <div className="prose prose-sm prose-invert max-w-none text-muted">
                {listing.description.split("\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}

          {/* Seller Info Card */}
          {seller && (
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-4 text-lg font-semibold text-foreground">
                Seller
              </h2>
              <Link
                href={`/profile/${seller.username}`}
                className="group flex items-center gap-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background">
                  {seller.avatar_url ? (
                    <img
                      src={seller.avatar_url}
                      alt={seller.display_name || seller.username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-foreground group-hover:text-accent">
                      {seller.display_name || seller.username}
                    </p>
                    {seller.is_verified && (
                      <Shield className="h-4 w-4 shrink-0 text-accent" />
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
                    <span className="capitalize">
                      {seller.tier.replace("_", " ")}
                    </span>
                    <span>{seller.total_transactions} sales</span>
                    <span>
                      Joined{" "}
                      {new Date(seller.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted group-hover:text-accent" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bid History (below the fold for auctions) */}
      {isAuction && bidHistory.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            Bid History
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-background/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Bidder
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bidHistory.map((bid, index) => (
                  <tr
                    key={bid.id}
                    className={index === 0 ? "bg-accent/5" : ""}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-background">
                          <User className="h-3 w-3 text-muted" />
                        </div>
                        <span
                          className={
                            index === 0
                              ? "font-semibold text-accent"
                              : "text-foreground"
                          }
                        >
                          {bid.bidder?.username ?? "Anonymous"}
                          {index === 0 && (
                            <span className="ml-2 text-xs text-accent">
                              Winning
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                      &euro;{bid.amount.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-muted">
                      {new Date(bid.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
