"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function DeleteListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setDeleting(true);
    const supabase = createClient();

    const { error } = await supabase
      .from("listings")
      .update({ status: "cancelled" })
      .eq("id", listingId);

    if (!error) {
      router.refresh();
    }

    setDeleting(false);
    setConfirming(false);
  }

  return (
    <button
      onClick={handleDelete}
      onBlur={() => setConfirming(false)}
      disabled={deleting}
      className={`rounded-lg border p-2 transition-colors ${
        confirming
          ? "border-red-500/50 bg-red-500/10 text-red-400"
          : "border-[#334155] text-[#94A3B8] hover:border-red-500/30 hover:text-red-400"
      }`}
      title={confirming ? "Click again to confirm" : "Cancel listing"}
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
    </button>
  );
}
