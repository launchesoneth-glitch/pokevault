import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { XP_AWARDS, TIERS } from "@/lib/constants";

export async function POST() {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Fetch current user profile
    const { data: profile, error: profileError } = await adminClient
      .from("users")
      .select("xp, tier, login_streak, last_login_date")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if already claimed today
    if (profile.last_login_date === todayStr) {
      return NextResponse.json(
        { error: "Daily login XP already claimed today", already_claimed: true },
        { status: 400 }
      );
    }

    // Calculate streak
    let newStreak = 1;
    if (profile.last_login_date) {
      const lastLogin = new Date(profile.last_login_date);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (profile.last_login_date === yesterdayStr) {
        // Consecutive day - increment streak
        newStreak = profile.login_streak + 1;
      }
      // If gap > 1 day, streak resets to 1 (already set above)
    }

    // Calculate XP to award
    let totalXp = XP_AWARDS.DAILY_LOGIN;
    const xpEvents: Array<{
      user_id: string;
      event_type: string;
      xp_amount: number;
      description: string;
    }> = [];

    xpEvents.push({
      user_id: user.id,
      event_type: "daily_login",
      xp_amount: XP_AWARDS.DAILY_LOGIN,
      description: `Daily login bonus (Day ${newStreak})`,
    });

    // Streak bonuses
    if (newStreak === 7) {
      totalXp += XP_AWARDS.LOGIN_STREAK_7;
      xpEvents.push({
        user_id: user.id,
        event_type: "login_streak_7",
        xp_amount: XP_AWARDS.LOGIN_STREAK_7,
        description: "7-day login streak bonus!",
      });
    }

    if (newStreak === 30) {
      totalXp += XP_AWARDS.LOGIN_STREAK_30;
      xpEvents.push({
        user_id: user.id,
        event_type: "login_streak_30",
        xp_amount: XP_AWARDS.LOGIN_STREAK_30,
        description: "30-day login streak bonus!",
      });
    }

    // Award recurring streak bonuses at multiples
    if (newStreak > 30 && newStreak % 30 === 0) {
      totalXp += XP_AWARDS.LOGIN_STREAK_30;
      xpEvents.push({
        user_id: user.id,
        event_type: "login_streak_30",
        xp_amount: XP_AWARDS.LOGIN_STREAK_30,
        description: `${newStreak}-day login streak bonus!`,
      });
    } else if (newStreak > 7 && newStreak % 7 === 0 && newStreak % 30 !== 0) {
      totalXp += XP_AWARDS.LOGIN_STREAK_7;
      xpEvents.push({
        user_id: user.id,
        event_type: "login_streak_7",
        xp_amount: XP_AWARDS.LOGIN_STREAK_7,
        description: `${newStreak}-day login streak bonus!`,
      });
    }

    // Insert XP events
    await adminClient.from("xp_events").insert(xpEvents);

    // Calculate new XP and check tier upgrade
    const newXp = profile.xp + totalXp;

    let newTier = profile.tier;
    for (let i = TIERS.length - 1; i >= 0; i--) {
      if (newXp >= TIERS[i].xpRequired) {
        newTier = TIERS[i].name as typeof newTier;
        break;
      }
    }

    const tierUpgraded = newTier !== profile.tier;

    // Update user profile
    await adminClient
      .from("users")
      .update({
        xp: newXp,
        tier: newTier,
        login_streak: newStreak,
        last_login_date: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // If tier upgraded, send notification
    if (tierUpgraded) {
      await adminClient.from("notifications").insert({
        user_id: user.id,
        type: "tier_upgrade",
        title: "Tier Upgrade!",
        message: `Congratulations! You've reached the ${newTier.replace(/_/g, " ")} tier!`,
        data: {
          old_tier: profile.tier,
          new_tier: newTier,
        },
      });
    }

    return NextResponse.json({
      message: "Daily login XP claimed",
      xp_awarded: totalXp,
      new_xp_total: newXp,
      login_streak: newStreak,
      tier: newTier,
      tier_upgraded: tierUpgraded,
      streak_bonus: totalXp > XP_AWARDS.DAILY_LOGIN,
    });
  } catch (err) {
    console.error("POST /api/gamification/daily-login error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
