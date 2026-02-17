import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Tables } from "@/types/database";
import { TIERS } from "@/lib/constants";
import { XpBar } from "@/components/ui/xp-bar";
import {
  Tag,
  DollarSign,
  ShoppingBag,
  Star,
  Trophy,
  ArrowRight,
  Bell,
  Clock,
  Target,
  Package,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getTier(xp: number) {
  let current = TIERS[0];
  for (const tier of TIERS as readonly any[]) {
    if (xp >= tier.min_xp) current = tier;
  }
  return current;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  /* ---- Profile ---------------------------------------------------------- */

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) redirect("/login");

  const user = profile as Tables<"users">;
  const tier = getTier(user.xp ?? 0);

  /* ---- Stats ------------------------------------------------------------ */

  const { count: activeListings } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", authUser.id)
    .eq("status", "active");

  const { data: salesAgg } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("seller_id", authUser.id)
    .eq("status", "completed");

  const totalSalesAmount = (salesAgg ?? []).reduce(
    (sum, o) => sum + (o.total_amount ?? 0),
    0,
  );

  const { data: purchaseAgg } = await supabase
    .from("orders")
    .select("total_amount")
    .eq("buyer_id", authUser.id)
    .eq("status", "completed");

  const totalPurchasesAmount = (purchaseAgg ?? []).reduce(
    (sum, o) => sum + (o.total_amount ?? 0),
    0,
  );

  /* ---- Recent orders ---------------------------------------------------- */

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at, listings(title)")
    .or(`buyer_id.eq.${authUser.id},seller_id.eq.${authUser.id}`)
    .order("created_at", { ascending: false })
    .limit(5);

  /* ---- Active challenges ------------------------------------------------ */

  const { data: activeChallenges } = await supabase
    .from("user_challenges")
    .select("*, challenges(*)")
    .eq("user_id", authUser.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(4);

  /* ---- Recent notifications --------------------------------------------- */

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, title, message, read, created_at")
    .eq("user_id", authUser.id)
    .order("created_at", { ascending: false })
    .limit(5);

  /* ---- Render ----------------------------------------------------------- */

  return (
    <div className="space-y-8">
      {/* Welcome ---------------------------------------------------------- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {user.display_name ?? user.username}!
        </h1>
        <p className="mt-1 text-sm text-muted">
          Here&apos;s what&apos;s happening with your PokeVault account.
        </p>
      </div>

      {/* Stats grid -------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={<Tag className="h-5 w-5" />}
          label="Active Listings"
          value={String(activeListings ?? 0)}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Sales"
          value={`$${(totalSalesAmount / 100).toFixed(2)}`}
        />
        <StatCard
          icon={<ShoppingBag className="h-5 w-5" />}
          label="Total Purchases"
          value={`$${(totalPurchasesAmount / 100).toFixed(2)}`}
        />
        <StatCard
          icon={<Star className="h-5 w-5" />}
          label="Current XP"
          value={String(user.xp ?? 0)}
        />
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-2 flex items-center gap-2 text-muted">
            <Trophy className="h-5 w-5" />
            <span className="text-xs font-medium uppercase tracking-wider">Current Tier</span>
          </div>
          <p
            className="text-lg font-bold"
            style={{ color: tier.color }}
          >
            {tier.name}
          </p>
          <div className="mt-3">
            <XpBar xp={user.xp ?? 0} tier={String((tier as any)?.name ?? "trainer")} />
          </div>
        </div>
      </div>

      {/* Two-column grid: orders + challenges ------------------------------ */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent orders --------------------------------------------------- */}
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Package className="h-4 w-4 text-accent" />
              Recent Orders
            </h2>
            <Link
              href="/dashboard/purchases"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recentOrders && recentOrders.length > 0 ? (
            <ul className="divide-y divide-border">
              {recentOrders.map((order) => {
                const listing = order.listings as { title: string } | null;
                return (
                  <li key={order.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                      <Package className="h-4 w-4 text-accent" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {listing?.title ?? "Order"}
                      </p>
                      <p className="text-xs text-muted">
                        {timeAgo(order.created_at)}
                      </p>
                    </div>
                    <OrderStatusBadge status={order.status} />
                    {order.total_amount != null && (
                      <span className="text-sm font-semibold">
                        ${(order.total_amount / 100).toFixed(2)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted">
              No orders yet. Start browsing!
            </div>
          )}
        </section>

        {/* Active challenges ------------------------------------------------ */}
        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="h-4 w-4 text-accent" />
              Active Challenges
            </h2>
          </div>

          {activeChallenges && activeChallenges.length > 0 ? (
            <ul className="divide-y divide-border">
              {activeChallenges.map((uc) => {
                const challenge = uc.challenges as Tables<"challenges">;
                const progress = uc.progress ?? 0;
                const goal = challenge?.requirement_value ?? 1;
                const pct = Math.min(Math.round((progress / goal) * 100), 100);

                return (
                  <li key={uc.challenge_id} className="px-5 py-4">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-sm font-medium">{challenge?.title ?? "Challenge"}</p>
                      <span className="text-xs text-muted">
                        {progress}/{goal}
                      </span>
                    </div>
                    {challenge?.description && (
                      <p className="mb-2 text-xs text-muted">{challenge.description}</p>
                    )}
                    {/* Progress bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center text-sm text-muted">
              No active challenges right now.
            </div>
          )}
        </section>
      </div>

      {/* Notifications ----------------------------------------------------- */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4 text-accent" />
            Recent Notifications
          </h2>
          <Link
            href="/dashboard/notifications"
            className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {notifications && notifications.length > 0 ? (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 px-5 py-3 ${
                  !n.read ? "bg-accent/5" : ""
                }`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    n.read ? "bg-transparent" : "bg-accent"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && (
                    <p className="mt-0.5 text-xs text-muted line-clamp-2">{n.message}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {timeAgo(n.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-muted">
            You&apos;re all caught up!
          </div>
        )}
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-500/10 text-green-400",
    pending: "bg-yellow-500/10 text-yellow-400",
    processing: "bg-blue-500/10 text-blue-400",
    shipped: "bg-purple-500/10 text-purple-400",
    cancelled: "bg-red-500/10 text-red-400",
    refunded: "bg-orange-500/10 text-orange-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${
        styles[status] ?? "bg-muted/10 text-muted"
      }`}
    >
      {status}
    </span>
  );
}
