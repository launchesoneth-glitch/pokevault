import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const PUBLIC_BUCKET = "listing-images";
const STAGING_BUCKET = "listing-images-staging";
const MODERATION_THRESHOLD = 0.25;

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function ensureBuckets(serviceClient: ReturnType<typeof getServiceClient>) {
  const { data: buckets } = await serviceClient.storage.listBuckets();
  const names = buckets?.map((b) => b.name) || [];

  if (!names.includes(PUBLIC_BUCKET)) {
    await serviceClient.storage.createBucket(PUBLIC_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/*"],
    });
  }

  if (!names.includes(STAGING_BUCKET)) {
    await serviceClient.storage.createBucket(STAGING_BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/*"],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const serviceClient = getServiceClient();
    await ensureBuckets(serviceClient);

    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const filePath = `${user.id}/${timestamp}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    // 1. Upload to PRIVATE staging bucket (not publicly accessible)
    const { error: stagingError } = await serviceClient.storage
      .from(STAGING_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (stagingError) {
      return NextResponse.json({ error: stagingError.message }, { status: 500 });
    }

    // 2. Generate a short-lived signed URL for SightEngine to access
    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from(STAGING_BUCKET)
      .createSignedUrl(filePath, 120); // 2 min expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      await serviceClient.storage.from(STAGING_BUCKET).remove([filePath]);
      return NextResponse.json({ error: "Failed to process image" }, { status: 500 });
    }

    // 3. Moderate the image via the signed URL — image is NOT public yet
    const moderationResult = await moderateImage(signedUrlData.signedUrl);
    if (!moderationResult.safe) {
      // Delete from staging — never reaches public bucket
      await serviceClient.storage.from(STAGING_BUCKET).remove([filePath]);
      return NextResponse.json(
        { error: moderationResult.reason || "Image rejected: inappropriate content detected." },
        { status: 422 }
      );
    }

    // 4. Image passed — upload to the PUBLIC bucket
    const { error: publicError } = await serviceClient.storage
      .from(PUBLIC_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    // Clean up staging regardless
    await serviceClient.storage.from(STAGING_BUCKET).remove([filePath]);

    if (publicError) {
      return NextResponse.json({ error: publicError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from(PUBLIC_BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("POST /api/listings/upload-image error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function moderateImage(
  imageUrl: string
): Promise<{ safe: boolean; reason?: string }> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    console.error("SightEngine not configured — blocking upload");
    return { safe: false, reason: "Image moderation is not available. Please try again later." };
  }

  try {
    const params = new URLSearchParams({
      url: imageUrl,
      models: "nudity-2.1,offensive,gore",
      api_user: apiUser,
      api_secret: apiSecret,
    });

    const res = await fetch(
      `https://api.sightengine.com/1.0/check.json?${params.toString()}`,
      { method: "GET" }
    );

    if (!res.ok) {
      console.error("SightEngine API error:", res.status, await res.text());
      return { safe: false, reason: "Image moderation service unavailable. Please try again later." };
    }

    const data = await res.json();

    if (data.status !== "success") {
      console.error("SightEngine response error:", data);
      return { safe: false, reason: "Image moderation failed. Please try again later." };
    }

    // Check nudity scores
    const nudity = data.nudity || {};
    if (
      nudity.sexual_activity > MODERATION_THRESHOLD ||
      nudity.sexual_display > MODERATION_THRESHOLD ||
      nudity.erotica > MODERATION_THRESHOLD
    ) {
      return { safe: false, reason: "Image rejected: nudity or sexual content detected." };
    }

    // Check for minor-related content
    if (nudity.none_minors !== undefined && nudity.none_minors < 0.5) {
      return { safe: false, reason: "Image rejected: content policy violation." };
    }

    // Check offensive content
    const offensive = data.offensive || {};
    if (offensive.prob > MODERATION_THRESHOLD) {
      return { safe: false, reason: "Image rejected: offensive content detected." };
    }

    // Check gore
    const gore = data.gore || {};
    if (gore.prob > MODERATION_THRESHOLD) {
      return { safe: false, reason: "Image rejected: violent or graphic content detected." };
    }

    return { safe: true };
  } catch (err) {
    console.error("Image moderation error:", err);
    return { safe: false, reason: "Image moderation service unavailable. Please try again later." };
  }
}
