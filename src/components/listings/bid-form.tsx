"use client";

import { useState, useCallback } from "react";
import { Gavel, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { getBidIncrement } from "@/lib/constants";

interface BidFormProps {
  listingId: string;
  currentBid: number;
  startingPrice: number | null;
}

export function BidForm({ listingId, currentBid, startingPrice }: BidFormProps) {
  const effectiveCurrentPrice =
    currentBid > 0 ? currentBid : (startingPrice ?? 0);
  const increment = getBidIncrement(effectiveCurrentPrice);
  const minimumBid = currentBid > 0 ? currentBid + increment : (startingPrice ?? increment);

  const [bidAmount, setBidAmount] = useState<string>(minimumBid.toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const numericBid = parseFloat(bidAmount) || 0;

  const addIncrements = useCallback(
    (multiplier: number) => {
      const current = parseFloat(bidAmount) || minimumBid;
      const newAmount = current + increment * multiplier;
      setBidAmount(newAmount.toFixed(2));
      setError(null);
      setSuccess(null);
    },
    [bidAmount, increment, minimumBid]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const amount = parseFloat(bidAmount);

    if (isNaN(amount) || amount < minimumBid) {
      setError(
        `Your bid must be at least \u20AC${minimumBid.toFixed(2)}`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/bids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listing_id: listingId,
          max_bid: amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to place bid. Please try again.");
      }

      setSuccess(
        `Bid placed successfully! Your maximum bid is \u20AC${amount.toFixed(2)}`
      );

      // Update minimum bid after successful placement
      const newMinimum = (data.current_bid ?? amount) + getBidIncrement(data.current_bid ?? amount);
      setBidAmount(newMinimum.toFixed(2));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to place bid. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="bid-amount"
          className="mb-1 block text-sm font-medium text-foreground"
        >
          Your Maximum Bid
        </label>
        <p className="mb-2 text-xs text-muted">
          Minimum bid: &euro;{minimumBid.toFixed(2)} (increment: &euro;
          {increment.toFixed(2)})
        </p>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
              &euro;
            </span>
            <input
              id="bid-amount"
              type="number"
              step="0.01"
              min={minimumBid}
              value={bidAmount}
              onChange={(e) => {
                setBidAmount(e.target.value);
                setError(null);
                setSuccess(null);
              }}
              className="w-full rounded-lg border border-border bg-background py-2.5 pl-8 pr-3 text-sm font-medium text-foreground tabular-nums placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Quick increment buttons */}
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => addIncrements(1)}
            disabled={isSubmitting}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            &euro;{increment.toFixed(2)}
          </button>
          <button
            type="button"
            onClick={() => addIncrements(5)}
            disabled={isSubmitting}
            className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
          >
            <Plus className="h-3 w-3" />
            &euro;{(increment * 5).toFixed(2)}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-pokered/30 bg-pokered/10 px-3 py-2.5 text-sm text-pokered">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2.5 text-sm text-green-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting || numericBid < minimumBid}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-semibold text-background transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Gavel className="h-5 w-5" />
        {isSubmitting ? "Placing Bid..." : "Place Bid"}
      </button>

      <p className="text-center text-xs text-muted">
        By placing a bid, you agree to pay if you are the winning bidder.
        Bids are binding.
      </p>
    </form>
  );
}
