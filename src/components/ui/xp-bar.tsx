"use client";

import { TIERS } from "@/lib/constants";
import { clsx } from "clsx";

interface XpBarProps {
  xp: number;
  tier: string;
  compact?: boolean;
  className?: string;
}

export function XpBar({ xp, tier, compact = false, className }: XpBarProps) {
  const currentTierIdx = TIERS.findIndex((t) => t.name === tier);
  const currentTier = TIERS[currentTierIdx] || TIERS[0];
  const nextTier = TIERS[currentTierIdx + 1];

  const tierLabels: Record<string, string> = {
    trainer: "Trainer",
    gym_leader: "Gym Leader",
    elite_four: "Elite Four",
    champion: "Champion",
    professor: "Professor",
  };

  if (!nextTier) {
    return (
      <div className={clsx("flex items-center gap-2", className)}>
        <span className="text-xs font-bold text-neon-gold">
          {tierLabels[tier]} — MAX
        </span>
        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-border">
          <div className="h-full w-full xp-bar-fill rounded-full" />
        </div>
      </div>
    );
  }

  const progress =
    ((xp - currentTier.xpRequired) /
      (nextTier.xpRequired - currentTier.xpRequired)) *
    100;

  if (compact) {
    return (
      <div className={clsx("flex items-center gap-2", className)}>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full xp-bar-fill animate-fill-xp"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold text-accent">{tierLabels[tier]}</span>
      </div>
    );
  }

  return (
    <div className={clsx("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-accent">{tierLabels[tier]}</span>
        <span className="text-muted">
          {xp.toLocaleString()} / {nextTier.xpRequired.toLocaleString()} XP
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full xp-bar-fill transition-all duration-500 animate-fill-xp"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
