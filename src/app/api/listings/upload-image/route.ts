import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

const BUCKET = "listing-images";
const MODERATION_THRESHOLD = 0.4; // reject if any NSFW score is above this

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function ensureBucket(serviceClient: ReturnType<typeof getServiceClient>) {
  const { data: buckets } = await serviceClient.storage.listBuckets();
  const exists = buckets?.some((b) => b.name === BUCKET);
  if (!exists) {
    await serviceClient.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
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

    // Moderate image with SightEngine before storing
    const moderationResult = await moderateImage(buffer, file.type);
    if (!moderationResult.safe) {
      return NextResponse.json(
        { error: moderationResult.reason || "Image rejected: inappropriate content detected." },
        { status: 422 }
      );
    }

    const serviceClient = getServiceClient();
    await ensureBucket(serviceClient);

    const ext = file.name.split(".").pop() || "jpg";
    const timestamp = Date.now();
    const filePath = `${user.id}/${timestamp}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    const { error: uploadError } = await serviceClient.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = serviceClient.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: publicUrl });
  } catch (err) {
    console.error("POST /api/listings/upload-image error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function moderateImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ safe: boolean; reason?: string }> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  // If SightEngine is not configured, allow the upload but log a warning
  if (!apiUser || !apiSecret) {
    console.warn("SightEngine not configured — skipping image moderation");
    return { safe: true };
  }

  try {
    const formData = new FormData();
    const uint8 = new Uint8Array(buffer);
    formData.append("media", new Blob([uint8], { type: mimeType }), "image.jpg");
    formData.append("models", "nudity-2.1,offensive,gore2");
    formData.append("api_user", apiUser);
    formData.append("api_secret", apiSecret);

    const res = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      console.error("SightEngine API error:", res.status);
      // Fail open — don't block uploads if moderation service is down
      return { safe: true };
    }

    const data = await res.json();

    if (data.status !== "success") {
      console.error("SightEngine response error:", data);
      return { safe: true };
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
    // Fail open on network errors
    return { safe: true };
  }
}
