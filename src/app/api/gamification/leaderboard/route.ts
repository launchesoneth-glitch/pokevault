import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "xp"; // sellers, buyers, xp
    const period = searchParams.get("period") || "alltime"; // weekly, monthly, alltime

    const supabase = await createClient();

    let orderColumn: string;
    switch (type) {
      case "sellers":
        orderColumn = "total_sales_volume";
        break;
      case "buyers":
        orderColumn = "total_purchases_volume";
        break;
      default:
        orderColumn = "xp";
    }

    // For weekly/monthly we'd ideally filter by time period on transactions
    // For MVP, just order by the aggregate columns
    const { data, error } = await supabase
      .from("users")
      .select("username, display_name, avatar_url, tier, xp, total_sales_volume, total_purchases_volume")
      .order(orderColumn, { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const leaderboard = (data || []).map((user, index) => ({
      rank: index + 1,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      tier: user.tier,
      score:
        type === "sellers"
          ? user.total_sales_volume
          : type === "buyers"
            ? user.total_purchases_volume
            : user.xp,
    }));

    return NextResponse.json({ leaderboard, type, period });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
