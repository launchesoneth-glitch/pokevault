"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Disc3,
  Loader2,
  Gift,
  Star,
  Sparkles,
  Lock,
  Crown,
  Zap,
} from "lucide-react";
import { WHEEL_PRIZES } from "@/lib/constants";

interface WheelPrize {
  id: string;
  label: string;
  value: string;
  color: string;
  probability: number;
}

interface SpinResult {
  prize: WheelPrize;
  new_xp?: number;
  message: string;
}

interface EligibilityStatus {
  eligible: boolean;
  reason: string;
  is_premium: boolean;
  next_spin_at: string | null;
}

const SEGMENT_COLORS = [
  "#EF4444", // pokered
  "#FACC15", // accent
  "#3B82F6", // info
  "#22C55E", // success
  "#F59E0B", // warning
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#06B6D4", // cyan
];

function getSegmentColor(index: number): string {
  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

export default function WheelSpinPage() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(
    null
  );
  const [isCheckingEligibility, setIsCheckingEligibility] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const spinResolveRef = useRef<((value: void) => void) | null>(null);

  const prizes: WheelPrize[] = (WHEEL_PRIZES as unknown as WheelPrize[]) || [];
  const segmentAngle = prizes.length > 0 ? 360 / prizes.length : 0;

  // Check eligibility on mount
  useEffect(() => {
    checkEligibility();
  }, []);

  const checkEligibility = async () => {
    setIsCheckingEligibility(true);
    try {
      const response = await fetch("/api/gamification/wheel-spin", {
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        setEligibility(data);
      }
    } catch {
      // Silently handle - user may not be logged in
    } finally {
      setIsCheckingEligibility(false);
    }
  };

  const handleSpin = useCallback(async () => {
    if (isSpinning || prizes.length === 0) return;

    setIsSpinning(true);
    setResult(null);
    setShowCelebration(false);
    setError(null);

    try {
      // Call API to determine prize (server-side RNG)
      const response = await fetch("/api/gamification/wheel-spin", {
        method: "POST",
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to spin the wheel");
      }

      const spinResult: SpinResult = await response.json();

      // Find the prize index
      const prizeIndex = prizes.findIndex(
        (p) => p.id === spinResult.prize.id
      );
      if (prizeIndex === -1) throw new Error("Invalid prize result");

      // Calculate target rotation:
      // The wheel is oriented so segment 0 is at the top.
      // We need the target segment to land at the top (under the pointer).
      // Segment center angle = prizeIndex * segmentAngle
      // We need to rotate so that angle is at 0 (top), but rotation goes clockwise,
      // so we subtract from 360.
      const targetSegmentAngle = prizeIndex * segmentAngle + segmentAngle / 2;
      const baseSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full spins
      const targetRotation =
        rotation + baseSpins * 360 + (360 - targetSegmentAngle);

      setRotation(targetRotation);

      // Wait for animation to complete (matches CSS transition duration)
      await new Promise<void>((resolve) => {
        spinResolveRef.current = resolve;
        setTimeout(resolve, 5000);
      });

      // Show result
      setResult(spinResult);
      setShowCelebration(true);

      // Hide celebration after a few seconds
      setTimeout(() => setShowCelebration(false), 4000);

      // Refresh eligibility
      checkEligibility();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setIsSpinning(false);
    }
  }, [isSpinning, prizes, rotation, segmentAngle]);

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="animate-confetti absolute"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-5%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              <div
                className="h-3 w-2 rounded-sm"
                style={{
                  backgroundColor:
                    SEGMENT_COLORS[
                      Math.floor(Math.random() * SEGMENT_COLORS.length)
                    ],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/gamification"
            className="mb-3 inline-flex items-center gap-1 text-sm text-[#94A3B8] transition-colors hover:text-[#FACC15]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Gamification Hub
          </Link>
          <h1 className="text-3xl font-bold">Prize Wheel</h1>
          <p className="mt-1 text-[#94A3B8]">
            Spin the wheel for a chance to win XP, discounts, and more!
          </p>
        </div>

        {/* Eligibility info */}
        <div className="mb-8 rounded-xl border border-[#334155] bg-[#1E293B] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FACC15]/10">
              <Gift className="h-5 w-5 text-[#FACC15]" />
            </div>
            <div className="text-sm">
              <p className="font-medium">How to Earn Spins</p>
              <div className="mt-1 space-y-1 text-[#94A3B8]">
                <p className="flex items-center gap-1.5">
                  <Crown className="h-3.5 w-3.5 text-[#FACC15]" />
                  <span>
                    <strong className="text-[#FACC15]">Premium</strong> members:
                    1 free spin per week
                  </span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#94A3B8]" />
                  <span>
                    All users: 1 spin per 500 XP milestone reached
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wheel Section */}
        <div className="flex flex-col items-center">
          {/* Pointer / Indicator */}
          <div className="relative z-10 mb-[-12px]">
            <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#FACC15] drop-shadow-lg" />
          </div>

          {/* Wheel */}
          <div className="relative">
            {/* Outer glow ring */}
            <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-[#FACC15]/20 via-[#EF4444]/20 to-[#3B82F6]/20 blur-xl" />

            {/* Wheel border ring */}
            <div className="relative rounded-full border-4 border-[#334155] bg-[#0F172A] p-2 shadow-2xl">
              <div
                ref={wheelRef}
                className="relative h-72 w-72 overflow-hidden rounded-full sm:h-80 sm:w-80"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)"
                    : "none",
                }}
              >
                <svg
                  viewBox="0 0 300 300"
                  className="h-full w-full"
                  style={{ transform: "rotate(-90deg)" }}
                >
                  {prizes.map((prize, i) => {
                    const startAngle = i * segmentAngle;
                    const endAngle = (i + 1) * segmentAngle;
                    const startRad = (startAngle * Math.PI) / 180;
                    const endRad = (endAngle * Math.PI) / 180;

                    const x1 = 150 + 150 * Math.cos(startRad);
                    const y1 = 150 + 150 * Math.sin(startRad);
                    const x2 = 150 + 150 * Math.cos(endRad);
                    const y2 = 150 + 150 * Math.sin(endRad);

                    const largeArcFlag = segmentAngle > 180 ? 1 : 0;

                    const pathD = [
                      `M 150 150`,
                      `L ${x1} ${y1}`,
                      `A 150 150 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                      `Z`,
                    ].join(" ");

                    // Text position (middle of arc, at 2/3 radius)
                    const midAngle =
                      ((startAngle + endAngle) / 2) * (Math.PI / 180);
                    const textR = 100;
                    const textX = 150 + textR * Math.cos(midAngle);
                    const textY = 150 + textR * Math.sin(midAngle);
                    const textRotation = (startAngle + endAngle) / 2;

                    return (
                      <g key={prize.id}>
                        <path
                          d={pathD}
                          fill={prize.color || getSegmentColor(i)}
                          stroke="#0F172A"
                          strokeWidth="1.5"
                        />
                        <text
                          x={textX}
                          y={textY}
                          fill="white"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                          style={{
                            textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                          }}
                        >
                          {prize.label.length > 12
                            ? prize.label.slice(0, 12) + "..."
                            : prize.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Center button overlay */}
                <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-[#334155] bg-[#0F172A] shadow-lg">
                  <Disc3
                    className={`h-6 w-6 text-[#FACC15] ${
                      isSpinning ? "animate-pulse" : ""
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Spin Button */}
          <div className="mt-8 text-center">
            {isCheckingEligibility ? (
              <div className="flex items-center gap-2 text-[#94A3B8]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Checking eligibility...
              </div>
            ) : eligibility && !eligibility.eligible ? (
              <div className="space-y-3">
                <button
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-[#334155] px-10 py-4 text-lg font-semibold text-[#94A3B8] opacity-60"
                >
                  <Lock className="h-5 w-5" />
                  Spin the Wheel
                </button>
                <p className="text-sm text-[#94A3B8]">{eligibility.reason}</p>
                {eligibility.next_spin_at && (
                  <p className="text-xs text-[#94A3B8]">
                    Next spin available:{" "}
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(eligibility.next_spin_at))}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={handleSpin}
                disabled={isSpinning || prizes.length === 0}
                className="group inline-flex items-center gap-2 rounded-xl bg-[#FACC15] px-10 py-4 text-lg font-bold text-[#0F172A] shadow-lg shadow-[#FACC15]/30 transition-all hover:bg-[#FACC15]/90 hover:shadow-xl hover:shadow-[#FACC15]/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110" />
                    Spin the Wheel!
                  </>
                )}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]">
              {error}
            </div>
          )}

          {/* Result Display */}
          {result && !isSpinning && (
            <div className="mt-8 w-full max-w-sm animate-fadeIn">
              <div className="overflow-hidden rounded-2xl border border-[#FACC15]/30 bg-gradient-to-b from-[#FACC15]/10 to-[#1E293B] shadow-xl shadow-[#FACC15]/10">
                <div className="px-6 pb-6 pt-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FACC15]/20">
                    <Gift className="h-8 w-8 text-[#FACC15]" />
                  </div>
                  <p className="text-sm font-medium text-[#FACC15]">
                    You Won!
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    {result.prize.label}
                  </h2>
                  <p className="mt-2 text-sm text-[#94A3B8]">
                    {result.message}
                  </p>
                  {result.new_xp !== undefined && (
                    <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-[#FACC15]/10 px-3 py-1 text-sm font-semibold text-[#FACC15]">
                      <Star className="h-4 w-4" />
                      {result.new_xp.toLocaleString()} Total XP
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Prize List */}
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-bold">Possible Prizes</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {prizes.map((prize, i) => (
              <div
                key={prize.id}
                className="flex items-center gap-3 rounded-lg border border-[#334155] bg-[#1E293B] p-3"
              >
                <div
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{
                    backgroundColor: prize.color || getSegmentColor(i),
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{prize.label}</p>
                  <p className="text-xs text-[#94A3B8]">{prize.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global styles for animations */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .animate-confetti {
          animation: confetti-fall linear forwards;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </main>
  );
}
