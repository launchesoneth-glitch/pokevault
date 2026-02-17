"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Crown,
  Trophy,
  TrendingUp,
  ShoppingCart,
  Gavel,
  Zap,
  Loader2,
  Medal,
  User,
} from "lucide-react";

type LeaderboardTab = "sellers" | "buyers" | "xp";
type Period = "week" | "month" | "all";

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  tier: string;
  score: number;
  rank: number;
  is_current_user: boolean;
}

const TABS: { key: LeaderboardTab; label: string; icon: typeof Trophy }[] = [
  { key: "sellers", label: "Top Sellers", icon: Gavel },
  { key: "buyers", label: "Top Buyers", icon: ShoppingCart },
  { key: "xp", label: "Top XP", icon: Zap },
];

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const TIER_BADGE_COLORS: Record<string, string> = {
  bronze: "bg-orange-400/20 text-orange-400 border-orange-400/30",
  silver: "bg-gray-400/20 text-gray-400 border-gray-400/30",
  gold: "bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/30",
  platinum: "bg-cyan-300/20 text-cyan-300 border-cyan-300/30",
  diamond: "bg-purple-400/20 text-purple-400 border-purple-400/30",
};

const PODIUM_STYLES = [
  {
    ring: "ring-[#FACC15]",
    bg: "bg-[#FACC15]/10",
    text: "text-[#FACC15]",
    icon: Crown,
  },
  {
    ring: "ring-gray-400",
    bg: "bg-gray-400/10",
    text: "text-gray-400",
    icon: Medal,
  },
  {
    ring: "ring-orange-400",
    bg: "bg-orange-400/10",
    text: "text-orange-400",
    icon: Medal,
  },
];

function formatScore(score: number, tab: LeaderboardTab): string {
  if (tab === "xp") {
    return `${score.toLocaleString()} XP`;
  }
  return `$${score.toLocaleString()}`;
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("sellers");
  const [period, setPeriod] = useState<Period>("month");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] =
    useState<LeaderboardEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        type: activeTab,
        period: period,
      });

      const response = await fetch(
        `/api/gamification/leaderboard?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch leaderboard");
      }

      const data = await response.json();
      setEntries(data.entries || []);
      setCurrentUserEntry(data.current_user || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard"
      );
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, period]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);
  const currentUserInTopList = entries.some((e) => e.is_current_user);

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/gamification"
            className="mb-3 inline-flex items-center gap-1 text-sm text-[#94A3B8] transition-colors hover:text-[#FACC15]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Gamification Hub
          </Link>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="mt-1 text-[#94A3B8]">
            See who&apos;s leading the pack on PokeVault.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-xl border border-[#334155] bg-[#1E293B] p-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-[#FACC15] text-[#0F172A] shadow-lg shadow-[#FACC15]/20"
                    : "text-[#94A3B8] hover:text-[#E2E8F0]"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.label.replace("Top ", "")}
                </span>
              </button>
            );
          })}
        </div>

        {/* Period Selector */}
        <div className="mb-8 flex justify-center gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                period === p.key
                  ? "bg-[#334155] text-[#E2E8F0]"
                  : "text-[#94A3B8] hover:text-[#E2E8F0]"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#FACC15]" />
            <p className="mt-3 text-[#94A3B8]">Loading leaderboard...</p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-6 text-center">
            <p className="text-[#EF4444]">{error}</p>
            <button
              onClick={fetchLeaderboard}
              className="mt-3 text-sm text-[#94A3B8] underline hover:text-[#E2E8F0]"
            >
              Try again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && entries.length === 0 && (
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-12 text-center">
            <Trophy className="mx-auto h-12 w-12 text-[#94A3B8]" />
            <h2 className="mt-4 text-xl font-semibold">No data yet</h2>
            <p className="mt-2 text-[#94A3B8]">
              Be the first to climb the leaderboard this{" "}
              {period === "week"
                ? "week"
                : period === "month"
                  ? "month"
                  : "time"}
              !
            </p>
          </div>
        )}

        {/* Leaderboard Content */}
        {!isLoading && !error && entries.length > 0 && (
          <>
            {/* Top 3 Podium */}
            <div className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
              {[1, 0, 2].map((podiumIndex) => {
                const entry = topThree[podiumIndex];
                if (!entry) return <div key={podiumIndex} />;

                const style = PODIUM_STYLES[podiumIndex];
                const Icon = style.icon;

                return (
                  <div
                    key={entry.user_id}
                    className={`flex flex-col items-center rounded-xl border bg-[#1E293B] p-4 text-center transition-all sm:p-5 ${
                      entry.is_current_user
                        ? "border-[#FACC15]/50 shadow-lg shadow-[#FACC15]/10"
                        : "border-[#334155]"
                    } ${podiumIndex === 0 ? "sm:-mt-4" : ""}`}
                  >
                    <div className="relative">
                      <div
                        className={`flex h-14 w-14 items-center justify-center rounded-full ring-2 sm:h-16 sm:w-16 ${style.ring} ${style.bg}`}
                      >
                        {entry.avatar_url ? (
                          <img
                            src={entry.avatar_url}
                            alt={entry.username}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          <span className={`text-xl font-bold ${style.text}`}>
                            {entry.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ${style.bg} ring-2 ring-[#1E293B]`}
                      >
                        <Icon className={`h-3.5 w-3.5 ${style.text}`} />
                      </div>
                    </div>

                    <p className={`mt-3 text-xl font-bold ${style.text}`}>
                      #{entry.rank}
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold">
                      {entry.username}
                      {entry.is_current_user && (
                        <span className="ml-1 text-xs text-[#FACC15]">
                          (You)
                        </span>
                      )}
                    </p>

                    <span
                      className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        TIER_BADGE_COLORS[entry.tier] ||
                        TIER_BADGE_COLORS.bronze
                      }`}
                    >
                      {entry.tier}
                    </span>

                    <p className="mt-2 text-sm font-bold">
                      {formatScore(entry.score, activeTab)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Remaining List */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#1E293B]">
                {rest.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                      i > 0 ? "border-t border-[#334155]" : ""
                    } ${
                      entry.is_current_user
                        ? "bg-[#FACC15]/5"
                        : "hover:bg-[#0F172A]/50"
                    }`}
                  >
                    {/* Rank */}
                    <span className="w-8 text-center text-sm font-bold text-[#94A3B8]">
                      {entry.rank}
                    </span>

                    {/* Avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#334155]">
                      {entry.avatar_url ? (
                        <img
                          src={entry.avatar_url}
                          alt={entry.username}
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-[#94A3B8]">
                          {entry.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Name & Tier */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {entry.username}
                        {entry.is_current_user && (
                          <span className="ml-1.5 text-xs font-medium text-[#FACC15]">
                            (You)
                          </span>
                        )}
                      </p>
                      <span
                        className={`inline-block rounded-full border px-1.5 py-px text-[9px] font-semibold capitalize ${
                          TIER_BADGE_COLORS[entry.tier] ||
                          TIER_BADGE_COLORS.bronze
                        }`}
                      >
                        {entry.tier}
                      </span>
                    </div>

                    {/* Score */}
                    <span className="shrink-0 text-sm font-bold">
                      {formatScore(entry.score, activeTab)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Current User Position (if not in visible list) */}
            {currentUserEntry && !currentUserInTopList && (
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <div className="h-px flex-1 bg-[#334155]" />
                  <span className="text-xs text-[#94A3B8]">Your Position</span>
                  <div className="h-px flex-1 bg-[#334155]" />
                </div>
                <div className="flex items-center gap-4 rounded-xl border border-[#FACC15]/30 bg-[#FACC15]/5 px-5 py-4">
                  <span className="w-8 text-center text-sm font-bold text-[#FACC15]">
                    {currentUserEntry.rank}
                  </span>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FACC15]/10 ring-2 ring-[#FACC15]/30">
                    {currentUserEntry.avatar_url ? (
                      <img
                        src={currentUserEntry.avatar_url}
                        alt={currentUserEntry.username}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-[#FACC15]">
                        {currentUserEntry.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {currentUserEntry.username}
                      <span className="ml-1.5 text-xs font-medium text-[#FACC15]">
                        (You)
                      </span>
                    </p>
                    <span
                      className={`inline-block rounded-full border px-1.5 py-px text-[9px] font-semibold capitalize ${
                        TIER_BADGE_COLORS[currentUserEntry.tier] ||
                        TIER_BADGE_COLORS.bronze
                      }`}
                    >
                      {currentUserEntry.tier}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#FACC15]">
                    {formatScore(currentUserEntry.score, activeTab)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
