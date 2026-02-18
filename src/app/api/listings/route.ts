import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = request.nextUrl;

    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const sort = searchParams.get("sort") || "created_at_desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const search = searchParams.get("search");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const condition = searchParams.get("condition");
    const gradingCompany = searchParams.get("gradingCompany");

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("listings")
      .select(
        "*, category:categories(*), listing_images(*), pokemon_card:pokemon_cards(*)",
        { count: "exact" }
      );

    // Apply filters
    if (status) {
      query = query.eq("status", status as any);
    } else {
      // Default to active listings for public browsing
      query = query.eq("status", "active");
    }

    if (type) {
      query = query.eq("listing_type", type as any);
    }

    if (category) {
      query = query.eq("category_id", category);
    }

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        query = query.gte("current_bid", min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        query = query.lte("current_bid", max);
      }
    }

    if (condition) {
      query = query.eq("condition", condition as any);
    }

    if (gradingCompany) {
      query = query.eq("grading_company", gradingCompany as any);
    }

    // Apply sorting
    switch (sort) {
      case "price_asc":
        query = query.order("current_bid", { ascending: true });
        break;
      case "price_desc":
        query = query.order("current_bid", { ascending: false });
        break;
      case "ending_soon":
        query = query
          .not("auction_end", "is", null)
          .order("auction_end", { ascending: true });
        break;
      case "most_bids":
        query = query.order("bid_count", { ascending: false });
        break;
      case "most_popular":
        query = query.order("view_count", { ascending: false });
        break;
      case "created_at_asc":
        query = query.order("created_at", { ascending: true });
        break;
      case "created_at_desc":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    // Apply pagination
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      listings: data,
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
    });
  } catch (err) {
    console.error("GET /api/listings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    const {
      consignment_id,
      seller_id,
      category_id,
      pokemon_card_id,
      title,
      description,
      condition,
      language,
      grading_company,
      grade,
      cert_number,
      listing_type,
      starting_price,
      reserve_price,
      buy_now_price,
      auction_start,
      auction_end,
      auto_extend,
      auto_extend_minutes,
      status: listingStatus,
      commission_rate,
      offers_enabled,
      minimum_offer,
      featured,
      images,
    } = body;

    // Determine if this is a marketplace listing (user) or consignment listing (admin)
    const isMarketplaceListing = !consignment_id;

    if (isMarketplaceListing) {
      // Marketplace listing: any authenticated user can create for themselves
      if (seller_id !== user.id) {
        return NextResponse.json(
          { error: "You can only create listings for yourself" },
          { status: 403 }
        );
      }

      if (!category_id || !title || !listing_type) {
        return NextResponse.json(
          { error: "Missing required fields: category_id, title, listing_type" },
          { status: 400 }
        );
      }
    } else {
      // Consignment listing: admin only
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (!seller_id || !category_id || !title || !listing_type) {
        return NextResponse.json(
          { error: "Missing required fields: consignment_id, seller_id, category_id, title, listing_type" },
          { status: 400 }
        );
      }
    }

    // Create the listing
    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .insert({
        consignment_id: consignment_id || null,
        seller_id: seller_id || user.id,
        category_id,
        pokemon_card_id: pokemon_card_id || null,
        title,
        description: description || null,
        condition: condition || null,
        language: language || "en",
        grading_company: grading_company || null,
        grade: grade != null ? grade : null,
        cert_number: cert_number || null,
        listing_type,
        starting_price: starting_price != null ? starting_price : null,
        reserve_price: reserve_price != null ? reserve_price : null,
        buy_now_price: buy_now_price != null ? buy_now_price : null,
        current_bid: starting_price || buy_now_price || 0,
        auction_start: auction_start || null,
        auction_end: auction_end || null,
        auto_extend: auto_extend ?? true,
        auto_extend_minutes: auto_extend_minutes ?? 2,
        status: listingStatus || "active",
        commission_rate: commission_rate != null ? commission_rate : null,
        offers_enabled: offers_enabled ?? false,
        minimum_offer: minimum_offer != null ? minimum_offer : null,
        featured: featured ?? false,
        listing_source: isMarketplaceListing ? "marketplace" : "consignment",
      })
      .select()
      .single();

    if (listingError) {
      return NextResponse.json(
        { error: listingError.message },
        { status: 500 }
      );
    }

    // Insert images if provided
    if (images && Array.isArray(images) && images.length > 0) {
      const imageInserts = images.map(
        (img: { image_url: string; sort_order?: number; is_primary?: boolean }, index: number) => ({
          listing_id: listing.id,
          image_url: img.image_url,
          sort_order: img.sort_order ?? index,
          is_primary: img.is_primary ?? index === 0,
        })
      );

      const { error: imageError } = await supabase
        .from("listing_images")
        .insert(imageInserts);

      if (imageError) {
        console.error("Error inserting listing images:", imageError);
      }
    }

    // Re-fetch with relations
    const { data: fullListing } = await supabase
      .from("listings")
      .select(
        "*, category:categories(*), listing_images(*), pokemon_card:pokemon_cards(*)"
      )
      .eq("id", listing.id)
      .single();

    return NextResponse.json({ listing: fullListing }, { status: 201 });
  } catch (err) {
    console.error("POST /api/listings error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
