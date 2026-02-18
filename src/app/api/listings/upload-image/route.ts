import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import https from "https";

const BUCKET = "listing-images";
const MODERATION_THRESHOLD = 0.25;

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

    // 1. Moderate image BEFORE storing
    const moderationResult = await moderateImage(buffer, file.type);
    if (!moderationResult.safe) {
      return NextResponse.json(
        { error: moderationResult.reason || "Image rejected: inappropriate content detected." },
        { status: 422 }
      );
    }

    // 2. Image passed moderation — now upload to storage
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

/**
 * Send image to SightEngine using raw Node.js https module.
 * This avoids all issues with fetch/FormData/Blob on Vercel serverless.
 */
function sightEngineRequest(body: Buffer, boundary: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.sightengine.com",
      port: 443,
      path: "/1.0/check.json",
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function moderateImage(
  buffer: Buffer,
  mimeType: string
): Promise<{ safe: boolean; reason?: string }> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;

  if (!apiUser || !apiSecret) {
    console.error("SightEngine not configured — blocking upload");
    return { safe: false, reason: "Image moderation is not available. Please try again later." };
  }

  try {
    const boundary = `----SightEngine${Date.now()}`;
    const parts: Buffer[] = [];

    const fields: Record<string, string> = {
      models: "nudity-2.1,offensive,gore",
      api_user: apiUser,
      api_secret: apiSecret,
    };

    for (const [key, value] of Object.entries(fields)) {
      parts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      ));
    }

    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="media"; filename="image.jpg"\r\nContent-Type: ${mimeType}\r\n\r\n`
    ));
    parts.push(buffer);
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const body = Buffer.concat(parts);

    const raw = await sightEngineRequest(body, boundary);

    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      console.error("SightEngine invalid JSON response:", raw.slice(0, 500));
      return { safe: false, reason: "Image moderation service error. Please try again." };
    }

    if (data.status !== "success") {
      console.error("SightEngine response error:", JSON.stringify(data));
      if (data.error?.code === 16) {
        return { safe: true };
      }
      return { safe: false, reason: `Image moderation failed: ${data.error?.message || JSON.stringify(data)}` };
    }

    const nudity = data.nudity || {};
    if (
      nudity.sexual_activity > MODERATION_THRESHOLD ||
      nudity.sexual_display > MODERATION_THRESHOLD ||
      nudity.erotica > MODERATION_THRESHOLD
    ) {
      return { safe: false, reason: "Image rejected: nudity or sexual content detected." };
    }

    if (nudity.none_minors !== undefined && nudity.none_minors < 0.5) {
      return { safe: false, reason: "Image rejected: content policy violation." };
    }

    const offensive = data.offensive || {};
    if (offensive.prob > MODERATION_THRESHOLD) {
      return { safe: false, reason: "Image rejected: offensive content detected." };
    }

    const gore = data.gore || {};
    if (gore.prob > MODERATION_THRESHOLD) {
      return { safe: false, reason: "Image rejected: violent or graphic content detected." };
    }

    return { safe: true };
  } catch (err) {
    console.error("Image moderation error:", err);
    return { safe: false, reason: `Image moderation error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
