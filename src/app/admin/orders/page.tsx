"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ShoppingCart,
  RefreshCw,
  Search,
  Truck,
  DollarSign,
  X,
  Loader2,
  Package,
} from "lucide-react";
import type { Database } from "@/types/database";

type Order = Database["public"]["Tables"]["orders"]["Row"] & {
  buyer?: { username: string } | null;
  seller?: { username: string } | null;
  listing?: { title: string } | null;
};

const STATUS_TABS = [
  "all",
  "pending",
  "paid",
  "shipped",
  "delivered",
  "refunded",
  "cancelled",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

function paymentBadge(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    paid: { bg: "bg-[#22C55E]/15", text: "text-[#22C55E]" },
    pending: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]" },
    failed: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]" },
    refunded: { bg: "bg-[#94A3B8]/15", text: "text-[#94A3B8]" },
  };
  const style = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.bg} ${style.text}`}
    >
      {status}
    </span>
  );
}

function shippingBadge(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]" },
    shipped: { bg: "bg-[#3B82F6]/15", text: "text-[#3B82F6]" },
    delivered: { bg: "bg-[#22C55E]/15", text: "text-[#22C55E]" },
    returned: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]" },
  };
  const style = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.bg} ${style.text}`}
    >
      {status}
    </span>
  );
}

export default function AdminOrdersPage() {
  const supabase = createClient();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Shipping modal state
  const [shippingModal, setShippingModal] = useState<{
    orderId: string;
    orderNumber: string;
  } | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("usps");
  const [markingShipped, setMarkingShipped] = useState(false);

  // Payout state
  const [processingPayout, setProcessingPayout] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select(
        `
        *,
        buyer:users!orders_buyer_id_fkey(username),
        seller:users!orders_seller_id_fkey(username),
        listing:listings!orders_listing_id_fkey(title)
      `
      )
      .order("created_at", { ascending: false });

    if (activeTab !== "all") {
      // Map tab to the relevant status field
      if (["pending", "paid", "refunded"].includes(activeTab)) {
        query = query.eq("payment_status", activeTab as any);
      } else if (["shipped", "delivered"].includes(activeTab)) {
        query = query.eq("status", activeTab as any);
      } else if (activeTab === "cancelled") {
        query = query.eq("status", "cancelled" as any);
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      setOrders(data as Order[]);
    }
    setLoading(false);
  }, [activeTab, supabase]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleMarkShipped() {
    if (!shippingModal || !trackingNumber.trim()) return;

    setMarkingShipped(true);
    const { error } = await supabase
      .from("orders")
      .update({
        status: "shipped" as any,
        tracking_number: trackingNumber.trim(),
        tracking_carrier: trackingCarrier,
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", shippingModal.orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === shippingModal.orderId
            ? {
                ...o,
                shipping_status: "shipped",
                tracking_number: trackingNumber.trim(),
              }
            : o
        )
      );
      setShippingModal(null);
      setTrackingNumber("");
      setTrackingCarrier("usps");
    }
    setMarkingShipped(false);
  }

  async function handleProcessPayout(orderId: string) {
    if (!confirm("Process payout for this order? This will release funds to the seller.")) {
      return;
    }

    setProcessingPayout(orderId);
    const { error } = await supabase
      .from("orders")
      .update({
        payout_status: "paid",
        paid_out_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (!error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, payout_status: "paid" } as Order : o
        )
      );
    }
    setProcessingPayout(null);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const filtered = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (o as any).order_number?.toString().includes(q) ||
      o.buyer?.username?.toLowerCase().includes(q) ||
      o.seller?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#E2E8F0]">Orders</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Manage marketplace orders, shipping, and payouts.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-2 text-sm font-medium text-[#E2E8F0] transition-colors hover:border-[#FACC15]/40 hover:text-[#FACC15]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search by order number, buyer, or seller..."
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
            <ShoppingCart className="mx-auto h-10 w-10 text-[#94A3B8]" />
            <p className="mt-3 text-sm text-[#94A3B8]">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155] text-left text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                  <th className="px-6 py-3">Order #</th>
                  <th className="px-6 py-3">Buyer</th>
                  <th className="px-6 py-3">Seller</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Payment</th>
                  <th className="px-6 py-3">Shipping</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filtered.map((order) => (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-[#0F172A]/40"
                  >
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-[#FACC15]">
                      #{(order as any).order_number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#E2E8F0]">
                      {order.buyer?.username ?? "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#E2E8F0]">
                      {order.seller?.username ?? "PokeVault"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-[#E2E8F0]">
                      ${(order as any).total_amount?.toFixed(2) ?? "0.00"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {paymentBadge((order as any).payment_status ?? "pending")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {shippingBadge(
                        (order as any).shipping_status ?? "pending"
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="flex items-center gap-2">
                        {/* Mark as shipped button */}
                        {(order as any).payment_status === "paid" &&
                          (order as any).shipping_status === "pending" && (
                            <button
                              onClick={() =>
                                setShippingModal({
                                  orderId: order.id,
                                  orderNumber: (order as any).order_number?.toString() ?? order.id.slice(0, 8),
                                })
                              }
                              className="inline-flex items-center gap-1 rounded-md bg-[#3B82F6]/15 px-2.5 py-1 text-xs font-medium text-[#3B82F6] transition-colors hover:bg-[#3B82F6]/25"
                            >
                              <Truck className="h-3 w-3" />
                              Ship
                            </button>
                          )}

                        {/* Process payout button */}
                        {(order as any).payment_status === "paid" &&
                          (order as any).shipping_status === "delivered" &&
                          (order as any).payout_status !== "processed" && (
                            <button
                              onClick={() => handleProcessPayout(order.id)}
                              disabled={processingPayout === order.id}
                              className="inline-flex items-center gap-1 rounded-md bg-[#22C55E]/15 px-2.5 py-1 text-xs font-medium text-[#22C55E] transition-colors hover:bg-[#22C55E]/25 disabled:opacity-50"
                            >
                              {processingPayout === order.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <DollarSign className="h-3 w-3" />
                              )}
                              Payout
                            </button>
                          )}

                        {(order as any).payout_status === "processed" && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#22C55E]/10 px-2.5 py-1 text-xs font-medium text-[#22C55E]/70">
                            <DollarSign className="h-3 w-3" />
                            Paid Out
                          </span>
                        )}

                        {(order as any).tracking_number && (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-[#94A3B8]"
                            title={(order as any).tracking_number}
                          >
                            <Package className="h-3 w-3" />
                            {(order as any).tracking_number.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shipping Modal */}
      {shippingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#334155] bg-[#1E293B] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#334155] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#E2E8F0]">
                Mark as Shipped
              </h3>
              <button
                onClick={() => {
                  setShippingModal(null);
                  setTrackingNumber("");
                  setTrackingCarrier("usps");
                }}
                className="text-[#94A3B8] transition-colors hover:text-[#E2E8F0]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-[#94A3B8]">
                Enter tracking information for order{" "}
                <span className="font-medium text-[#FACC15]">
                  #{shippingModal.orderNumber}
                </span>
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                  Carrier
                </label>
                <select
                  value={trackingCarrier}
                  onChange={(e) => setTrackingCarrier(e.target.value)}
                  className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                >
                  <option value="usps">USPS</option>
                  <option value="ups">UPS</option>
                  <option value="fedex">FedEx</option>
                  <option value="dhl">DHL</option>
                  <option value="canada_post">Canada Post</option>
                  <option value="royal_mail">Royal Mail</option>
                  <option value="japan_post">Japan Post</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                  Tracking Number <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  autoFocus
                  className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-[#334155] px-6 py-4">
              <button
                onClick={() => {
                  setShippingModal(null);
                  setTrackingNumber("");
                  setTrackingCarrier("usps");
                }}
                className="rounded-lg border border-[#334155] px-4 py-2 text-sm font-medium text-[#94A3B8] transition-colors hover:text-[#E2E8F0]"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkShipped}
                disabled={!trackingNumber.trim() || markingShipped}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3B82F6]/90 disabled:opacity-50"
              >
                {markingShipped && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {markingShipped ? "Updating..." : "Mark as Shipped"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
