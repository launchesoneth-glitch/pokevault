"use client";

import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { clsx } from "clsx";

interface AuctionTimerProps {
  endTime: string;
  compact?: boolean;
  className?: string;
  onEnd?: () => void;
}

export function AuctionTimer({
  endTime,
  compact = false,
  className,
  onEnd,
}: AuctionTimerProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(endTime));

  useEffect(() => {
    const interval = setInterval(() => {
      const tl = getTimeLeft(endTime);
      setTimeLeft(tl);
      if (tl.total <= 0) {
        clearInterval(interval);
        onEnd?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, onEnd]);

  const isUrgent = timeLeft.total > 0 && timeLeft.total < 2 * 60 * 1000;
  const isWarning =
    timeLeft.total > 0 &&
    timeLeft.total < 60 * 60 * 1000 &&
    !isUrgent;
  const isEnded = timeLeft.total <= 0;

  if (compact) {
    return (
      <div
        className={clsx(
          "flex items-center gap-1 text-xs",
          isEnded && "text-muted",
          isUrgent && "text-pokered animate-pulse-red font-semibold",
          isWarning && "text-warning",
          !isEnded && !isUrgent && !isWarning && "text-muted",
          className
        )}
      >
        <Clock className="h-3 w-3" />
        {isEnded ? (
          "Ended"
        ) : (
          <span>
            {timeLeft.days > 0 && `${timeLeft.days}d `}
            {timeLeft.hours > 0 && `${timeLeft.hours}h `}
            {timeLeft.minutes}m {timeLeft.seconds}s
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        isEnded && "border-border bg-surface text-muted",
        isUrgent &&
          "border-pokered/50 bg-pokered/10 text-pokered animate-pulse-red",
        isWarning && "border-warning/50 bg-warning/10 text-warning",
        !isEnded &&
          !isUrgent &&
          !isWarning &&
          "border-border bg-surface text-foreground",
        className
      )}
    >
      <Clock className="h-4 w-4" />
      {isEnded ? (
        <span className="text-sm font-medium">Auction Ended</span>
      ) : (
        <div className="flex items-baseline gap-1">
          {timeLeft.days > 0 && (
            <TimeUnit value={timeLeft.days} label="d" />
          )}
          <TimeUnit value={timeLeft.hours} label="h" />
          <TimeUnit value={timeLeft.minutes} label="m" />
          <TimeUnit value={timeLeft.seconds} label="s" />
        </div>
      )}
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <span className="text-sm">
      <span className="font-bold">{value.toString().padStart(2, "0")}</span>
      <span className="text-xs opacity-70">{label}</span>
    </span>
  );
}

function getTimeLeft(endTime: string) {
  const total = new Date(endTime).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };

  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const seconds = Math.floor((total / 1000) % 60);

  return { total, days, hours, minutes, seconds };
}
