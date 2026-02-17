import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Target,
  Clock,
  Zap,
  CheckCircle2,
  Trophy,
  Flame,
  Timer,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: string;
  requirement_value: number;
  xp_reward: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  icon: string | null;
}

interface UserChallenge {
  challenge_id: string;
  progress: number;
  completed: boolean;
  completed_at: string | null;
}

function formatTimeRemaining(endsAt: string): string {
  const now = new Date();
  const end = new Date(endsAt);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

function getTimeUrgency(endsAt: string | null): "none" | "low" | "medium" | "high" {
  if (!endsAt) return "none";
  const now = new Date();
  const end = new Date(endsAt);
  const diffHours = (end.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (diffHours <= 0) return "high";
  if (diffHours <= 6) return "high";
  if (diffHours <= 24) return "medium";
  return "low";
}

const URGENCY_COLORS = {
  none: "text-[#94A3B8]",
  low: "text-[#22C55E]",
  medium: "text-[#F59E0B]",
  high: "text-[#EF4444]",
};

function ChallengeProgressBar({
  progress,
  total,
  completed,
}: {
  progress: number;
  total: number;
  completed: boolean;
}) {
  const percentage = Math.min(100, (progress / total) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">
          {progress} / {total}
        </span>
        <span
          className={`font-semibold ${
            completed ? "text-[#22C55E]" : "text-[#E2E8F0]"
          }`}
        >
          {Math.round(percentage)}%
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-[#334155]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            completed
              ? "bg-[#22C55E]"
              : "bg-gradient-to-r from-[#FACC15] to-[#F59E0B]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default async function ChallengesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/gamification/challenges");
  }

  // Fetch active challenges
  const { data: challenges } = await supabase
    .from("challenges")
    .select("*")
    .eq("is_active", true)
    .order("ends_at", { ascending: true, nullsFirst: false });

  // Fetch user's challenge progress
  const { data: userChallenges } = await supabase
    .from("user_challenges")
    .select("challenge_id, progress, completed, completed_at")
    .eq("user_id", user.id);

  const allChallenges: Challenge[] = (challenges as unknown as Challenge[]) || [];
  const userProgressMap = new Map<string, UserChallenge>();
  ((userChallenges as UserChallenge[]) || []).forEach((uc) => {
    userProgressMap.set(uc.challenge_id, uc);
  });

  // Separate into active and completed
  const activeChallenges = allChallenges.filter((c) => {
    const uc = userProgressMap.get(c.id);
    return !uc?.completed;
  });

  const completedChallenges = allChallenges.filter((c) => {
    const uc = userProgressMap.get(c.id);
    return uc?.completed;
  });

  // Stats
  const totalXpAvailable = activeChallenges.reduce(
    (sum, c) => sum + c.xp_reward,
    0
  );
  const totalXpEarned = completedChallenges.reduce(
    (sum, c) => sum + c.xp_reward,
    0
  );

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/gamification"
            className="mb-3 inline-flex items-center gap-1 text-sm text-[#94A3B8] transition-colors hover:text-[#FACC15]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Gamification Hub
          </Link>
          <h1 className="text-3xl font-bold">Challenges</h1>
          <p className="mt-1 text-[#94A3B8]">
            Complete challenges to earn bonus XP and climb the ranks.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4 text-center">
            <p className="text-2xl font-bold text-[#FACC15]">
              {activeChallenges.length}
            </p>
            <p className="text-xs text-[#94A3B8]">Active</p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4 text-center">
            <p className="text-2xl font-bold text-[#22C55E]">
              {completedChallenges.length}
            </p>
            <p className="text-xs text-[#94A3B8]">Completed</p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4 text-center">
            <p className="text-2xl font-bold">{totalXpAvailable}</p>
            <p className="text-xs text-[#94A3B8]">XP Available</p>
          </div>
        </div>

        {/* Active Challenges */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <Flame className="h-5 w-5 text-[#F59E0B]" />
            Active Challenges
          </h2>

          {activeChallenges.length === 0 ? (
            <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-8 text-center">
              <Target className="mx-auto h-10 w-10 text-[#94A3B8]" />
              <p className="mt-3 text-[#94A3B8]">
                No active challenges right now. Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeChallenges.map((challenge) => {
                const userProgress = userProgressMap.get(challenge.id);
                const progress = userProgress?.progress || 0;
                const urgency = getTimeUrgency(challenge.ends_at);
                const isTimed = !!challenge.ends_at;

                return (
                  <div
                    key={challenge.id}
                    className="overflow-hidden rounded-xl border border-[#334155] bg-[#1E293B] transition-colors hover:border-[#FACC15]/20"
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">
                              {challenge.title}
                            </h3>
                            {isTimed && (
                              <span
                                className={`inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-2.5 py-0.5 text-xs font-medium ${URGENCY_COLORS[urgency]}`}
                              >
                                <Timer className="h-3 w-3" />
                                {formatTimeRemaining(challenge.ends_at!)}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-[#94A3B8]">
                            {challenge.description}
                          </p>
                        </div>

                        {/* XP Reward */}
                        <div className="shrink-0 rounded-lg bg-[#FACC15]/10 px-3 py-2 text-center">
                          <Zap className="mx-auto h-4 w-4 text-[#FACC15]" />
                          <p className="mt-0.5 text-sm font-bold text-[#FACC15]">
                            +{challenge.xp_reward}
                          </p>
                          <p className="text-[10px] text-[#94A3B8]">XP</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-5">
                        <ChallengeProgressBar
                          progress={progress}
                          total={challenge.requirement_value}
                          completed={false}
                        />
                      </div>
                    </div>

                    {/* Timed indicator bar at bottom */}
                    {isTimed && urgency === "high" && (
                      <div className="h-1 w-full bg-gradient-to-r from-[#EF4444] to-[#F59E0B]" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Completed Challenges */}
        {completedChallenges.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
              <Trophy className="h-5 w-5 text-[#22C55E]" />
              Completed
              <span className="ml-1 rounded-full bg-[#22C55E]/10 px-2.5 py-0.5 text-sm font-medium text-[#22C55E]">
                {completedChallenges.length}
              </span>
            </h2>

            <div className="space-y-3">
              {completedChallenges.map((challenge) => {
                const userProgress = userProgressMap.get(challenge.id);

                return (
                  <div
                    key={challenge.id}
                    className="flex items-center gap-4 rounded-xl border border-[#22C55E]/20 bg-[#22C55E]/5 px-6 py-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22C55E]/20">
                      <CheckCircle2 className="h-5 w-5 text-[#22C55E]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{challenge.title}</h3>
                      <p className="text-sm text-[#94A3B8]">
                        {challenge.description}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-[#22C55E]">
                        +{challenge.xp_reward} XP
                      </p>
                      {userProgress?.completed_at && (
                        <p className="text-[10px] text-[#94A3B8]">
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(userProgress.completed_at))}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalXpEarned > 0 && (
              <div className="mt-4 flex items-center justify-end gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-[#22C55E]" />
                <span className="text-[#94A3B8]">Total earned:</span>
                <span className="font-bold text-[#22C55E]">
                  +{totalXpEarned} XP
                </span>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
