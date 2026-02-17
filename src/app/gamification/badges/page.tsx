import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Lock,
  Medal,
  ShoppingCart,
  Gavel,
  Library,
  Users,
  Milestone,
  CheckCircle2,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  category: "selling" | "buying" | "collecting" | "social" | "milestone";
  requirement_description: string;
  xp_reward: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

interface UserBadge {
  badge_id: string;
  earned_at: string;
}

const CATEGORY_META: Record<
  string,
  { label: string; icon: typeof Medal; color: string }
> = {
  selling: {
    label: "Selling",
    icon: Gavel,
    color: "text-[#22C55E]",
  },
  buying: {
    label: "Buying",
    icon: ShoppingCart,
    color: "text-[#3B82F6]",
  },
  collecting: {
    label: "Collecting",
    icon: Library,
    color: "text-[#FACC15]",
  },
  social: {
    label: "Social",
    icon: Users,
    color: "text-[#EF4444]",
  },
  milestone: {
    label: "Milestone",
    icon: Milestone,
    color: "text-purple-400",
  },
};

const RARITY_STYLES: Record<
  string,
  { border: string; glow: string; label: string }
> = {
  common: {
    border: "border-[#94A3B8]/30",
    glow: "",
    label: "text-[#94A3B8]",
  },
  uncommon: {
    border: "border-[#22C55E]/30",
    glow: "",
    label: "text-[#22C55E]",
  },
  rare: {
    border: "border-[#3B82F6]/40",
    glow: "shadow-[#3B82F6]/10 shadow-lg",
    label: "text-[#3B82F6]",
  },
  epic: {
    border: "border-purple-400/40",
    glow: "shadow-purple-400/10 shadow-lg",
    label: "text-purple-400",
  },
  legendary: {
    border: "border-[#FACC15]/50",
    glow: "shadow-[#FACC15]/20 shadow-xl",
    label: "text-[#FACC15]",
  },
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

export default async function BadgesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/gamification/badges");
  }

  // Fetch all badges
  const { data: badges } = await supabase
    .from("badges")
    .select("*")
    .order("category")
    .order("rarity");

  // Fetch user's earned badges
  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("badge_id, earned_at")
    .eq("user_id", user.id);

  const allBadges: Badge[] = (badges as unknown as Badge[]) || [];
  const earnedBadgeMap = new Map<string, string>();
  ((userBadges as UserBadge[]) || []).forEach((ub) => {
    earnedBadgeMap.set(ub.badge_id, ub.earned_at);
  });

  // Group by category
  const categories = [
    "selling",
    "buying",
    "collecting",
    "social",
    "milestone",
  ] as const;

  const badgesByCategory = categories.map((cat) => ({
    category: cat,
    badges: allBadges.filter((b) => b.category === cat),
    earned: allBadges.filter(
      (b) => b.category === cat && earnedBadgeMap.has(b.id)
    ).length,
  }));

  const totalEarned = earnedBadgeMap.size;
  const totalBadges = allBadges.length;

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/gamification"
            className="mb-3 inline-flex items-center gap-1 text-sm text-[#94A3B8] transition-colors hover:text-[#FACC15]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Gamification Hub
          </Link>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">Badges</h1>
              <p className="mt-1 text-[#94A3B8]">
                Collect badges by completing achievements across PokeVault.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-2.5">
              <Medal className="h-5 w-5 text-[#FACC15]" />
              <span className="text-lg font-bold">{totalEarned}</span>
              <span className="text-[#94A3B8]">/ {totalBadges}</span>
              <span className="text-sm text-[#94A3B8]">collected</span>
            </div>
          </div>
        </div>

        {/* Badge progress bar */}
        <div className="mb-10">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#334155]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#FACC15] to-[#F59E0B] transition-all"
              style={{
                width: `${totalBadges > 0 ? (totalEarned / totalBadges) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="mt-2 text-sm text-[#94A3B8]">
            {totalBadges > 0
              ? `${Math.round((totalEarned / totalBadges) * 100)}% complete`
              : "No badges available yet"}
          </p>
        </div>

        {/* Badges by Category */}
        <div className="space-y-12">
          {badgesByCategory.map(({ category, badges: catBadges, earned }) => {
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;

            if (catBadges.length === 0) return null;

            return (
              <section key={category}>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1E293B]">
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{meta.label}</h2>
                    <p className="text-xs text-[#94A3B8]">
                      {earned} of {catBadges.length} earned
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {catBadges.map((badge) => {
                    const isEarned = earnedBadgeMap.has(badge.id);
                    const earnedAt = earnedBadgeMap.get(badge.id);
                    const rarity = RARITY_STYLES[badge.rarity] || RARITY_STYLES.common;

                    return (
                      <details
                        key={badge.id}
                        className={`group cursor-pointer rounded-xl border bg-[#1E293B] transition-all ${
                          isEarned
                            ? `${rarity.border} ${rarity.glow} hover:scale-[1.02]`
                            : "border-[#334155] opacity-60 grayscale hover:opacity-80 hover:grayscale-[50%]"
                        }`}
                      >
                        <summary className="flex flex-col items-center p-5 text-center [&::-webkit-details-marker]:hidden">
                          {/* Badge icon / image */}
                          <div className="relative mb-3">
                            {badge.icon_url ? (
                              <img
                                src={badge.icon_url}
                                alt={badge.name}
                                className="h-16 w-16 rounded-full object-cover"
                              />
                            ) : (
                              <div
                                className={`flex h-16 w-16 items-center justify-center rounded-full border-2 ${
                                  isEarned
                                    ? "border-[#FACC15]/50 bg-[#FACC15]/10"
                                    : "border-[#334155] bg-[#0F172A]"
                                }`}
                              >
                                {isEarned ? (
                                  <Star className="h-7 w-7 text-[#FACC15]" />
                                ) : (
                                  <Lock className="h-6 w-6 text-[#94A3B8]" />
                                )}
                              </div>
                            )}

                            {/* Earned checkmark */}
                            {isEarned && (
                              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#22C55E] ring-2 ring-[#1E293B]">
                                <CheckCircle2 className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>

                          <h3 className="text-sm font-semibold leading-tight">
                            {badge.name}
                          </h3>

                          <span
                            className={`mt-1.5 text-[10px] font-semibold uppercase tracking-wider ${rarity.label}`}
                          >
                            {badge.rarity}
                          </span>
                        </summary>

                        {/* Expanded details */}
                        <div className="border-t border-[#334155] px-4 pb-4 pt-3">
                          <p className="text-xs text-[#94A3B8]">
                            {badge.description}
                          </p>

                          <div className="mt-3 rounded-lg bg-[#0F172A] p-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                              Requirement
                            </p>
                            <p className="mt-0.5 text-xs">
                              {badge.requirement_description}
                            </p>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="rounded-full bg-[#FACC15]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FACC15]">
                              +{badge.xp_reward} XP
                            </span>
                            {isEarned && earnedAt && (
                              <span className="text-[10px] text-[#94A3B8]">
                                Earned {formatDate(earnedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* Empty state */}
        {allBadges.length === 0 && (
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-12 text-center">
            <Medal className="mx-auto h-12 w-12 text-[#94A3B8]" />
            <h2 className="mt-4 text-xl font-semibold">
              Badges Coming Soon
            </h2>
            <p className="mt-2 text-[#94A3B8]">
              Achievement badges are being prepared. Check back soon!
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
