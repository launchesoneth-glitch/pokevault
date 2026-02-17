import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { XP_AWARDS, TIERS } from "@/lib/constants";

type RouteParams = { params: Promise<{ userId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cannot follow yourself
    if (user.id === userId) {
      return NextResponse.json(
        { error: "You cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if target user exists
    const { data: targetUser, error: targetError } = await supabase
      .from("users")
      .select("id, username")
      .eq("id", userId)
      .single();

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .single();

    if (existingFollow) {
      return NextResponse.json(
        { error: "You are already following this user" },
        { status: 409 }
      );
    }

    // Create follow relationship
    const { error: followError } = await supabase
      .from("follows")
      .insert({
        follower_id: user.id,
        following_id: userId,
      });

    if (followError) {
      return NextResponse.json(
        { error: followError.message },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient();

    // Award XP for following
    await adminClient.from("xp_events").insert({
      user_id: user.id,
      event_type: "follow_user",
      xp_amount: XP_AWARDS.FOLLOW_USER,
      description: `Followed user ${targetUser.username}`,
      reference_id: userId,
    });

    // Update user XP
    const { data: profile } = await adminClient
      .from("users")
      .select("xp, tier")
      .eq("id", user.id)
      .single();

    if (profile) {
      const newXp = profile.xp + XP_AWARDS.FOLLOW_USER;

      let newTier = profile.tier;
      for (let i = TIERS.length - 1; i >= 0; i--) {
        if (newXp >= TIERS[i].xpRequired) {
          newTier = TIERS[i].name as typeof newTier;
          break;
        }
      }

      await adminClient
        .from("users")
        .update({ xp: newXp, tier: newTier })
        .eq("id", user.id);
    }

    // Notify the followed user
    const { data: followerProfile } = await adminClient
      .from("users")
      .select("username, display_name")
      .eq("id", user.id)
      .single();

    await adminClient.from("notifications").insert({
      user_id: userId,
      type: "new_follower",
      title: "New Follower",
      message: `${followerProfile?.display_name || followerProfile?.username || "Someone"} started following you.`,
      data: {
        follower_id: user.id,
        follower_username: followerProfile?.username,
      },
    });

    return NextResponse.json(
      { message: "Successfully followed user" },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/users/follow/[userId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Cannot unfollow yourself
    if (user.id === userId) {
      return NextResponse.json(
        { error: "You cannot unfollow yourself" },
        { status: 400 }
      );
    }

    // Remove follow relationship
    const { error: deleteError } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", userId);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Successfully unfollowed user" });
  } catch (err) {
    console.error("DELETE /api/users/follow/[userId] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
