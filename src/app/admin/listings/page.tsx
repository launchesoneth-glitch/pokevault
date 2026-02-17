"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Gavel,
  Plus,
  RefreshCw,
  Search,
  Pencil,
  XCircle,
  Tag,
  ShoppingBag,
  Clock,
} from "lucide-react";
import type { Database } from "@/types/database";

type Listing = Database["public"]["Tables"]["listings"]["Row"];

const STATUS_TABS = [
  "all",
  "active",
  "draft",
  "ended",
  "sold",
  "cancelled",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-[#22C55E]/15", text: "text-[#22C55E]" },
    draft: { bg: "bg-[#94A3B8]/15", text: "text-[#94A3B8]" },
    ended: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]" },
    sold: { bg: "bg-[#3B82F6]/15", text: "text-[#3B82F6]" },
    cancelled: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]" },
  };
  const style = map[status] ?? map.draft;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.bg} ${style.text}`}
    >
      {status}
    </span>
  );
}

function listingTypeBadge(type: string) {
  const map: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    auction: { icon: Gavel, label: "Auction", color: "#FACC15" },
    buy_now: { icon: ShoppingBag, label: "Buy Now", color: "#22C55E" },
    auction_with_buy_now: { icon: Tag, label: "Auction + BIN", color: "#3B82F6" },
  };
  const config = map[type] ?? map.auction;
  const Icon = config.icon;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color: config.color }}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default function AdminListingsPage() {
  const supabase = createClient();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeTab !== "all") {
      query = query.eq("status", activeTab);
    }

    const { data, error } = await query;

    if (!error && data) {
      setListings(data as Listing[]);
    }
    setLoading(false);
  }, [activeTab, supabase]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function handleCancel(id: string) {
    if (!confirm("Are you sure you want to cancel this listing?")) return;

    setCancellingId(id);
    const { error } = await supabase
      .from("listings")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: "cancelled" } : l))
      );
    }
    setCancellingId(null);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatPrice(listing: Listing): string {
    if (
      listing.listing_type === "buy_now" &&
      (listing as any).buy_now_price != null
    ) {
      return `$${(listing as any).buy_now_price.toFixed(2)}`;
    }
    if (
      listing.listing_type === "auction" ||
      listing.listing_type === "auction_with_buy_now"
    ) {
      const currentBid = (listing as any).current_bid ?? (listing as any).starting_price ?? 0;
      return `$${currentBid.toFixed(2)}`;
    }
    return "N/A";
  }

  function getBidCount(listing: Listing): number {
    return (listing as any).bid_count ?? 0;
  }

  const filtered = listings.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l as any).title?.toLowerCase().includes(q) ||
      l.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#E2E8F0]">Listings</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Manage all marketplace listings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchListings}
            className="inline-flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-2 text-sm font-medium text-[#E2E8F0] transition-colors hover:border-[#FACC15]/40 hover:text-[#FACC15]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/admin/listings/create"
            className="inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-4 py-2 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90"
          >
            <Plus className="h-4 w-4" />
            Create Listing
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search by title or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-[#334155] bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
        />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[#334155] bg-[#1E293B] p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-[#FACC15]/15 text-[#FACC15]"
                : "text-[#94A3B8] hover:text-[#E2E8F0]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#1E293B]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-[#94A3B8]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Gavel className="mx-auto h-10 w-10 text-[#94A3B8]" />
            <p className="mt-3 text-sm text-[#94A3B8]">No listings found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155] text-left text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Price / Bid</th>
                  <th className="px-6 py-3">Bids</th>
                  <th className="px-6 py-3">Created</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filtered.map((listing) => (
                  <tr
                    key={listing.id}
                    className="transition-colors hover:bg-[#0F172A]/40"
                  >
                    <td className="max-w-[250px] truncate px-6 py-3 text-sm font-medium text-[#E2E8F0]">
                      {(listing as any).title ?? "Untitled"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {listingTypeBadge(
                        (listing as any).listing_type ?? "auction"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {statusBadge(listing.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-[#E2E8F0]">
                      {formatPrice(listing)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#94A3B8]">
                      {getBidCount(listing)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#94A3B8]">
                      {formatDate(listing.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/listings/${listing.id}/edit`}
                          className="inline-flex items-center gap-1 rounded-md border border-[#334155] px-2.5 py-1 text-xs font-medium text-[#E2E8F0] transition-colors hover:border-[#FACC15]/40 hover:text-[#FACC15]"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit
                        </Link>
                        {listing.status === "active" ||
                        listing.status === "draft" ? (
                          <button
                            onClick={() => handleCancel(listing.id)}
                            disabled={cancellingId === listing.id}
                            className="inline-flex items-center gap-1 rounded-md border border-[#EF4444]/30 px-2.5 py-1 text-xs font-medium text-[#EF4444] transition-colors hover:bg-[#EF4444]/10 disabled:opacity-50"
                          >
                            <XCircle className="h-3 w-3" />
                            Cancel
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
