import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WHEEL_PRIZES, XP_AWARDS } from "@/lib/constants";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("is_premium_member, xp")
      .eq("id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check eligibility
    if (profile.is_premium_member) {
      // Premium: 1 spin per week (resets Monday)
      const now = new Date();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      monday.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("wheel_spins")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monday.toISOString());

      if ((count || 0) >= 1) {
        return NextResponse.json(
          { error: "You already used your weekly spin" },
          { status: 400 }
        );
      }
    } else {
      // Non-premium: earn spin at 500 XP milestones
      const currentMilestone = Math.floor(profile.xp / 500);
      const { count } = await supabase
        .from("wheel_spins")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if ((count || 0) >= currentMilestone) {
        return NextResponse.json(
          { error: "No spins available. Earn more XP!" },
          { status: 400 }
        );
      }
    }

    // Select prize based on weights
    const totalWeight = WHEEL_PRIZES.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedPrize: (typeof WHEEL_PRIZES)[number] = WHEEL_PRIZES[0];

    for (const prize of WHEEL_PRIZES) {
      random -= prize.weight;
      if (random <= 0) {
        selectedPrize = prize;
        break;
      }
    }

    // Record the spin
    await supabase.from("wheel_spins").insert({
      user_id: user.id,
      prize_type: selectedPrize.type,
      prize_value: selectedPrize.value,
    });

    // Apply XP prizes immediately
    if (selectedPrize.type === "xp_boost") {
      const xpAmount = parseInt(selectedPrize.value);
      await (supabase as any).rpc("increment_user_xp" as any as any, {
        p_user_id: user.id,
        p_amount: xpAmount,
      }).then(() => {
        // fallback: direct update if RPC doesn't exist
      }).then(null, async () => {
        await supabase
          .from("users")
          .update({ xp: profile.xp + xpAmount })
          .eq("id", user.id);
      });

      await supabase.from("xp_events").insert({
        user_id: user.id,
        event_type: "wheel_spin",
        xp_amount: xpAmount,
        description: `Won ${selectedPrize.label} from wheel spin`,
      });
    }

    return NextResponse.json({
      prize: {
        type: selectedPrize.type,
        value: selectedPrize.value,
        label: selectedPrize.label,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to spin wheel" },
      { status: 500 }
    );
  }
}
