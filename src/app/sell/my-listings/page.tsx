import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  ChevronLeft,
  Tag,
  Eye,
  Package,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DeleteListingButton } from "./delete-button";

interface Listing {
  id: string;
  title: string;
  listing_type: string;
  status: string;
  buy_now_price: number | null;
  current_bid: number;
  bid_count: number;
  view_count: number;
  favorite_count: number;
  condition: string | null;
  grading_company: string | null;
  grade: number | null;
  created_at: string;
  listing_images: { image_url: string; is_primary: boolean }[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30",
  draft: "bg-[#94A3B8]/20 text-[#94A3B8] border-[#94A3B8]/30",
  sold: "bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/30",
  ended: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  unsold: "bg-[#94A3B8]/20 text-[#94A3B8] border-[#94A3B8]/30",
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

export default async function MyListingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/sell/my-listings");
  }

  const { data: listings } = await supabase
    .from("listings")
    .select("*, listing_images(*)")
    .eq("seller_id", user.id)
    .eq("listing_source", "marketplace")
    .order("created_at", { ascending: false });

  const items: Listing[] = (listings as unknown as Listing[]) || [];

  const stats = {
    total: items.length,
    active: items.filter((l) => l.status === "active").length,
    sold: items.filter((l) => l.status === "sold").length,
    totalViews: items.reduce((sum, l) => sum + (l.view_count || 0), 0),
  };

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/sell"
              className="mb-3 inline-flex items-center gap-1 text-sm text-[#94A3B8] transition-colors hover:text-[#FACC15]"
            >
              <ChevronLeft className="h-4 w-4" />
              Create New Listing
            </Link>
            <h1 className="text-3xl font-bold">My Listings</h1>
            <p className="mt-1 text-[#94A3B8]">
              Manage your marketplace listings.
            </p>
          </div>
          <Link
            href="/sell"
            className="inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90"
          >
            <Plus className="h-4 w-4" />
            New Listing
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
            <p className="text-sm text-[#94A3B8]">Total</p>
            <p className="mt-1 text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
            <p className="text-sm text-[#94A3B8]">Active</p>
            <p className="mt-1 text-2xl font-bold text-[#22C55E]">
              {stats.active}
            </p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
            <p className="text-sm text-[#94A3B8]">Sold</p>
            <p className="mt-1 text-2xl font-bold text-[#FACC15]">
              {stats.sold}
            </p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
            <p className="text-sm text-[#94A3B8]">Total Views</p>
            <p className="mt-1 text-2xl font-bold text-[#3B82F6]">
              {stats.totalViews}
            </p>
          </div>
        </div>

        {/* Listing List */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-[#94A3B8]" />
            <h2 className="mt-4 text-xl font-semibold">No listings yet</h2>
            <p className="mt-2 text-[#94A3B8]">
              Create your first listing and start selling on PokeVault.
            </p>
            <Link
              href="/sell"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-6 py-3 font-semibold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90"
            >
              Create a Listing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((listing) => {
              const primaryImage = listing.listing_images?.find(
                (img) => img.is_primary
              );
              const imageUrl =
                primaryImage?.image_url ||
                listing.listing_images?.[0]?.image_url;

              const displayPrice =
                listing.listing_type === "buy_now"
                  ? listing.buy_now_price
                  : listing.current_bid;

              return (
                <div
                  key={listing.id}
                  className="flex items-center gap-4 rounded-xl border border-[#334155] bg-[#1E293B] p-4 transition-colors hover:border-[#FACC15]/20"
                >
                  {/* Thumbnail */}
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#0F172A]">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Tag className="h-8 w-8 text-[#334155]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">
                        {listing.title}
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_COLORS[listing.status] ||
                          STATUS_COLORS.draft
                        }`}
                      >
                        {listing.status}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#94A3B8]">
                      {listing.grading_company && listing.grade && (
                        <span className="uppercase">
                          {listing.grading_company} {listing.grade}
                        </span>
                      )}
                      {listing.condition && (
                        <span className="capitalize">
                          {listing.condition.replace(/_/g, " ")}
                        </span>
                      )}
                      <span>{formatDate(listing.created_at)}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {listing.view_count}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-extrabold text-[#FACC15]">
                      &euro;{displayPrice?.toFixed(2)}
                    </p>
                    {listing.bid_count > 0 && (
                      <p className="text-xs text-[#94A3B8]">
                        {listing.bid_count} bid
                        {listing.bid_count !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Link
                      href={`/listing/${listing.id}`}
                      className="rounded-lg border border-[#334155] p-2 text-[#94A3B8] transition-colors hover:border-[#FACC15]/30 hover:text-[#FACC15]"
                      title="View listing"
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    {listing.status === "active" && (
                      <DeleteListingButton listingId={listing.id} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
