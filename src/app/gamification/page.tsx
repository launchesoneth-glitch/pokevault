import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Target,
  Crown,
  Disc3,
  Medal,
  TrendingUp,
  ChevronRight,
  Star,
  Zap,
  Award,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TIERS, XP_AWARDS } from "@/lib/constants";
import { XpBar } from "@/components/ui/xp-bar";

interface UserProfile {
  id: string;
  username: string;
  xp: number;
  tier: string;
  avatar_url: string | null;
  is_premium_member: boolean;
}

interface BadgeSummary {
  total: number;
  earned: number;
}

interface ChallengeSummary {
  active: number;
  completed: number;
}

function getTierInfo(currentXp: number) {
  let currentTier: (typeof TIERS)[number] = TIERS[0];
  let nextTier: (typeof TIERS)[number] | null = TIERS[1] || null;

  for (let i = 0; i < TIERS.length; i++) {
    if (currentXp >= TIERS[i].min_xp) {
      currentTier = TIERS[i];
      nextTier = TIERS[i + 1] || null;
    }
  }

  const xpIntoCurrentTier = currentXp - currentTier.min_xp;
  const xpForNextTier = nextTier
    ? nextTier.min_xp - currentTier.min_xp
    : 0;
  const progress = nextTier
    ? Math.min(100, (xpIntoCurrentTier / xpForNextTier) * 100)
    : 100;

  return { currentTier, nextTier, progress, xpToNext: nextTier ? nextTier.min_xp - currentXp : 0 };
}

const TIER_COLORS: Record<string, string> = {
  bronze: "from-orange-400 to-orange-600",
  silver: "from-gray-300 to-gray-500",
  gold: "from-yellow-300 to-yellow-500",
  platinum: "from-cyan-300 to-cyan-500",
  diamond: "from-purple-400 to-purple-600",
};

const QUICK_LINKS = [
  {
    href: "/gamification/badges",
    label: "Badges",
    description: "Collect achievement badges",
    icon: Medal,
    color: "text-[#FACC15]",
    bgColor: "bg-[#FACC15]/10",
  },
  {
    href: "/gamification/challenges",
    label: "Challenges",
    description: "Complete tasks for XP",
    icon: Target,
    color: "text-[#22C55E]",
    bgColor: "bg-[#22C55E]/10",
  },
  {
    href: "/gamification/leaderboard",
    label: "Leaderboard",
    description: "See top traders",
    icon: Crown,
    color: "text-[#3B82F6]",
    bgColor: "bg-[#3B82F6]/10",
  },
  {
    href: "/gamification/wheel",
    label: "Wheel Spin",
    description: "Spin to win prizes",
    icon: Disc3,
    color: "text-[#EF4444]",
    bgColor: "bg-[#EF4444]/10",
  },
];

const XP_ACTIVITY_EXAMPLES = [
  { action: "List an item", xp: XP_AWARDS.LIST_ITEM || 10, icon: Zap },
  { action: "Make a sale", xp: XP_AWARDS.SELL_ITEM || 25, icon: TrendingUp },
  { action: "Win an auction", xp: XP_AWARDS.BUY_ITEM || 15, icon: Award },
  { action: "Daily login", xp: XP_AWARDS.DAILY_LOGIN || 5, icon: Flame },
  { action: "Leave a review", xp: XP_AWARDS.LEAVE_REVIEW || 10, icon: Star },
];

export default async function GamificationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirect=/gamification");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("id, username, xp, tier, avatar_url, is_premium_member")
    .eq("id", user.id)
    .single();

  const userProfile: UserProfile = profile || {
    id: user.id,
    username: "Trainer",
    xp: 0,
    tier: "bronze",
    avatar_url: null,
    is_premium_member: false,
  };

  // Fetch badge counts
  const { count: totalBadges } = await supabase
    .from("badges")
    .select("*", { count: "exact", head: true });

  const { count: earnedBadges } = await supabase
    .from("user_badges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Fetch challenge counts
  const { count: activeChallenges } = await supabase
    .from("challenges")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: completedChallenges } = await supabase
    .from("user_challenges")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("completed", true);

  // Fetch leaderboard rank
  const { count: usersAbove } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .gt("xp", userProfile.xp);

  const leaderboardRank = (usersAbove || 0) + 1;

  const tierInfo = getTierInfo(userProfile.xp);

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold">Rewards Hub</h1>
          <p className="mt-1 text-[#94A3B8]">
            Level up, earn badges, and compete with fellow collectors.
          </p>
        </div>

        {/* Profile & XP Card */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-[#334155] bg-[#1E293B]">
          <div
            className={`bg-gradient-to-r ${TIER_COLORS[userProfile.tier] || TIER_COLORS.bronze} p-[1px]`}
          >
            <div className="rounded-t-2xl bg-[#1E293B] px-6 py-8 sm:px-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                {/* Avatar */}
                <div className="flex shrink-0 items-center gap-4">
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${TIER_COLORS[userProfile.tier] || TIER_COLORS.bronze} text-2xl font-bold text-[#0F172A]`}
                  >
                    {userProfile.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">
                      {userProfile.username}
                    </h2>
                    <p className="flex items-center gap-1.5 text-sm capitalize text-[#94A3B8]">
                      <Trophy className="h-4 w-4 text-[#FACC15]" />
                      {tierInfo.currentTier.name} Tier
                      {userProfile.is_premium_member && (
                        <span className="ml-2 rounded-full bg-[#FACC15]/20 px-2 py-0.5 text-xs font-semibold text-[#FACC15]">
                          PREMIUM
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* XP Progress */}
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {userProfile.xp.toLocaleString()} XP
                    </span>
                    {tierInfo.nextTier && (
                      <span className="text-[#94A3B8]">
                        {tierInfo.xpToNext.toLocaleString()} XP to{" "}
                        {tierInfo.nextTier.name}
                      </span>
                    )}
                  </div>
                  <div className="mt-2">
                    <XpBar
                      xp={userProfile.xp}
                      tier={userProfile.tier}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FACC15]/10">
                <Medal className="h-5 w-5 text-[#FACC15]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{earnedBadges || 0}</p>
                <p className="text-xs text-[#94A3B8]">
                  of {totalBadges || 0} Badges
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#22C55E]/10">
                <Target className="h-5 w-5 text-[#22C55E]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completedChallenges || 0}</p>
                <p className="text-xs text-[#94A3B8]">Challenges Done</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3B82F6]/10">
                <Crown className="h-5 w-5 text-[#3B82F6]" />
              </div>
              <div>
                <p className="text-2xl font-bold">#{leaderboardRank}</p>
                <p className="text-xs text-[#94A3B8]">Leaderboard Rank</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EF4444]/10">
                <Disc3 className="h-5 w-5 text-[#EF4444]" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeChallenges || 0}
                </p>
                <p className="text-xs text-[#94A3B8]">Active Challenges</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links Grid */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-4 rounded-xl border border-[#334155] bg-[#1E293B] p-5 transition-all hover:border-[#FACC15]/30 hover:shadow-lg"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${link.bgColor}`}
                >
                  <Icon className={`h-6 w-6 ${link.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{link.label}</h3>
                  <p className="text-sm text-[#94A3B8]">{link.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#94A3B8] transition-transform group-hover:translate-x-1 group-hover:text-[#FACC15]" />
              </Link>
            );
          })}
        </div>

        {/* How to Earn XP */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Zap className="h-5 w-5 text-[#FACC15]" />
            How to Earn XP
          </h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Every action on PokeVault earns you experience points. Level up your
            tier for exclusive perks and lower commission rates.
          </p>

          <div className="mt-6 space-y-3">
            {XP_ACTIVITY_EXAMPLES.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.action}
                  className="flex items-center justify-between rounded-lg bg-[#0F172A] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-[#94A3B8]" />
                    <span className="text-sm">{activity.action}</span>
                  </div>
                  <span className="rounded-full bg-[#FACC15]/10 px-3 py-1 text-xs font-semibold text-[#FACC15]">
                    +{activity.xp} XP
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
