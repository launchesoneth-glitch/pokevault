import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ username: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { username } = await params;
    const supabase = await createClient();

    // Fetch public profile (exclude sensitive fields)
    const { data: profile, error } = await supabase
      .from("users")
      .select(
        "id, username, display_name, avatar_url, bio, country_code, xp, tier, total_transactions, is_verified, is_premium_member, created_at"
      )
      .eq("username", username)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get follower and following counts
    const [
      { count: followerCount },
      { count: followingCount },
    ] = await Promise.all([
      supabase
        .from("follows")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabase
        .from("follows")
        .select("following_id", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);

    // Check if the current user follows this profile
    let isFollowing = false;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.id !== profile.id) {
      const { data: followRecord } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .single();

      isFollowing = !!followRecord;
    }

    // Fetch user's active listings
    const { data: listings, count: listingCount } = await supabase
      .from("listings")
      .select("id, title, current_bid, listing_type, status, listing_images(*)", {
        count: "exact",
      })
      .eq("seller_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8);

    // Fetch user badges
    const { data: badges } = await supabase
      .from("user_badges")
      .select("*, badge:badges(*)")
      .eq("user_id", profile.id)
      .order("earned_at", { ascending: false });

    return NextResponse.json({
      user: {
        ...profile,
        follower_count: followerCount ?? 0,
        following_count: followingCount ?? 0,
        is_following: isFollowing,
        active_listing_count: listingCount ?? 0,
      },
      listings: listings ?? [],
      badges: badges ?? [],
    });
  } catch (err) {
    console.error("GET /api/users/[username] error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
