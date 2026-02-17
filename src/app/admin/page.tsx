import { createClient } from "@/lib/supabase/server";
import {
  DollarSign,
  Gavel,
  PackageSearch,
  Truck,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react";

interface StatCard {
  label: string;
  value: string;
  icon: React.ElementType;
  change?: { value: string; positive: boolean };
  color: string;
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch all stats in parallel
  const [
    gmvResult,
    activeListingsResult,
    pendingConsignmentsResult,
    ordersToShipResult,
    totalUsersResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabase
      .from("orders")
      .select("total_amount")
      .eq("payment_status", "paid"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("consignments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .eq("shipping_status", "pending"),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select(
        `
        id,
        order_number,
        total_amount,
        payment_status,
        shipping_status,
        created_at,
        buyer:profiles!orders_buyer_id_fkey(username),
        listing:listings!orders_listing_id_fkey(title)
      `
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const totalGmv =
    gmvResult.data?.reduce((sum, o) => sum + (o.total_amount ?? 0), 0) ?? 0;

  const stats: StatCard[] = [
    {
      label: "Total GMV",
      value: `$${totalGmv.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "#22C55E",
    },
    {
      label: "Active Listings",
      value: (activeListingsResult.count ?? 0).toLocaleString(),
      icon: Gavel,
      color: "#3B82F6",
    },
    {
      label: "Pending Consignments",
      value: (pendingConsignmentsResult.count ?? 0).toLocaleString(),
      icon: PackageSearch,
      color: "#F59E0B",
    },
    {
      label: "Orders to Ship",
      value: (ordersToShipResult.count ?? 0).toLocaleString(),
      icon: Truck,
      color: "#EF4444",
    },
    {
      label: "Total Users",
      value: (totalUsersResult.count ?? 0).toLocaleString(),
      icon: Users,
      color: "#FACC15",
    },
  ];

  const recentOrders = recentOrdersResult.data ?? [];

  function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  function paymentStatusBadge(status: string) {
    const map: Record<string, { bg: string; text: string }> = {
      paid: { bg: "bg-[#22C55E]/15", text: "text-[#22C55E]" },
      pending: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]" },
      failed: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]" },
      refunded: { bg: "bg-[#94A3B8]/15", text: "text-[#94A3B8]" },
    };
    const style = map[status] ?? map.pending;
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
      >
        {status}
      </span>
    );
  }

  function shippingStatusBadge(status: string) {
    const map: Record<string, { bg: string; text: string }> = {
      shipped: { bg: "bg-[#3B82F6]/15", text: "text-[#3B82F6]" },
      delivered: { bg: "bg-[#22C55E]/15", text: "text-[#22C55E]" },
      pending: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]" },
    };
    const style = map[status] ?? map.pending;
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
      >
        {status}
      </span>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#E2E8F0]">Dashboard</h2>
        <p className="mt-1 text-sm text-[#94A3B8]">
          Overview of your marketplace activity.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#334155] bg-[#1E293B] p-5 transition-colors hover:border-[#FACC15]/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#94A3B8]">
                {stat.label}
              </span>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${stat.color}15` }}
              >
                <stat.icon
                  className="h-5 w-5"
                  style={{ color: stat.color }}
                />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#E2E8F0]">
              {stat.value}
            </p>
            {stat.change && (
              <div className="mt-2 flex items-center gap-1 text-xs">
                {stat.change.positive ? (
                  <ArrowUpRight className="h-3 w-3 text-[#22C55E]" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-[#EF4444]" />
                )}
                <span
                  className={
                    stat.change.positive
                      ? "text-[#22C55E]"
                      : "text-[#EF4444]"
                  }
                >
                  {stat.change.value}
                </span>
                <span className="text-[#94A3B8]">vs last month</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent activity feed */}
      <div className="rounded-xl border border-[#334155] bg-[#1E293B]">
        <div className="flex items-center justify-between border-b border-[#334155] px-6 py-4">
          <h3 className="text-lg font-semibold text-[#E2E8F0]">
            Recent Orders
          </h3>
          <Clock className="h-5 w-5 text-[#94A3B8]" />
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-[#94A3B8]">
            No orders yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155] text-left text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Buyer</th>
                  <th className="px-6 py-3">Listing</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Payment</th>
                  <th className="px-6 py-3">Shipping</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {recentOrders.map((order: any) => (
                  <tr
                    key={order.id}
                    className="transition-colors hover:bg-[#0F172A]/40"
                  >
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-[#FACC15]">
                      #{order.order_number}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#E2E8F0]">
                      {order.buyer?.username ?? "Unknown"}
                    </td>
                    <td className="max-w-[200px] truncate px-6 py-3 text-sm text-[#E2E8F0]">
                      {order.listing?.title ?? "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-[#E2E8F0]">
                      ${order.total_amount?.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {paymentStatusBadge(order.payment_status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {shippingStatusBadge(order.shipping_status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-xs text-[#94A3B8]">
                      {formatRelativeTime(order.created_at)}
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
