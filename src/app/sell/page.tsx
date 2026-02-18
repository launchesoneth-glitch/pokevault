"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CONDITIONS, GRADING_COMPANIES, CARD_LANGUAGES } from "@/lib/constants";
import {
  Upload,
  X,
  Loader2,
  ImagePlus,
  DollarSign,
  Package,
  Info,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const MAX_IMAGES = 8;
const MIN_IMAGES = 1;

interface ImagePreview {
  file: File;
  url: string;
}

export default function SellPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth state
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Categories from DB
  const [categories, setCategories] = useState<
    { id: string; name: string; display_name: string }[]
  >([]);

  // Form fields - Basic Info
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Form fields - Item Details
  const [condition, setCondition] = useState("");
  const [language, setLanguage] = useState("en");
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState("");
  const [grade, setGrade] = useState("");
  const [certNumber, setCertNumber] = useState("");

  // Form fields - Pricing
  const [price, setPrice] = useState("");

  // Images
  const [images, setImages] = useState<ImagePreview[]>([]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        router.replace("/auth/login?redirect=/sell");
        return;
      }

      setUser({ id: authUser.id });
      setAuthLoading(false);
    }

    checkAuth();
  }, [router, supabase.auth]);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      const { data, error: catError } = await supabase
        .from("categories")
        .select("id, name, display_name")
        .order("sort_order", { ascending: true });

      if (!catError && data) {
        setCategories(data);
      }
    }

    fetchCategories();
  }, [supabase]);

  // Image handling
  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        setError("Maximum " + MAX_IMAGES + " images allowed.");
        return;
      }

      const newFiles = Array.from(files).slice(0, remaining);
      const validFiles = newFiles.filter((f) => {
        if (!f.type.startsWith("image/")) return false;
        if (f.size > 10 * 1024 * 1024) return false;
        return true;
      });

      if (validFiles.length < newFiles.length) {
        setError(
          "Some files were skipped. Only images under 10 MB are accepted."
        );
      }

      const previews: ImagePreview[] = validFiles.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      }));

      setImages((prev) => [...prev, ...previews]);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [images.length]
  );

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validation
  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!title.trim()) errors.title = "Title is required.";
    if (!categoryId) errors.categoryId = "Please select a category.";
    if (!condition) errors.condition = "Please select a condition.";
    if (!language) errors.language = "Please select a language.";

    if (isGraded) {
      if (!gradingCompany) errors.gradingCompany = "Select a grading company.";
      if (!grade) {
        errors.grade = "Enter a grade.";
      } else {
        const g = parseFloat(grade);
        if (isNaN(g) || g < 1 || g > 10) {
          errors.grade = "Grade must be between 1 and 10.";
        }
      }
    }

    if (!price) {
      errors.price = "Price is required.";
    } else {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0) {
        errors.price = "Enter a valid price greater than 0.";
      }
    }

    if (images.length < MIN_IMAGES)
      errors.images = "At least " + MIN_IMAGES + " image is required.";
    if (images.length > MAX_IMAGES)
      errors.images = "Maximum " + MAX_IMAGES + " images allowed.";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!validate()) return;
    if (!user) return;

    setSubmitting(true);

    try {
      // 1. Upload images to Supabase Storage
      const uploadedUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const file = images[i].file;
        const ext = file.name.split(".").pop() || "jpg";
        const timestamp = Date.now();
        const filePath = user.id + "/" + timestamp + "-" + i + "." + ext;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(
            "Failed to upload image " + (i + 1) + ": " + uploadError.message
          );
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("listing-images").getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // 2. Build the listing payload
      const imagePayloads = uploadedUrls.map((url, idx) => ({
        image_url: url,
        sort_order: idx,
        is_primary: idx === 0,
      }));

      const payload = {
        seller_id: user.id,
        category_id: categoryId,
        title: title.trim(),
        description: description.trim() || null,
        condition: condition || null,
        language,
        grading_company: isGraded ? gradingCompany : null,
        grade: isGraded && grade ? parseFloat(grade) : null,
        cert_number: isGraded && certNumber.trim() ? certNumber.trim() : null,
        listing_type: "buy_now" as const,
        buy_now_price: parseFloat(price),
        current_bid: parseFloat(price),
        starting_price: parseFloat(price),
        status: "active" as const,
        offers_enabled: false,
        auto_extend: false,
        auto_extend_minutes: 0,
        images: imagePayloads,
      };

      // 3. Create listing via API
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create listing.");
      }

      const { listing } = await res.json();
      router.push("/listing/" + listing.id);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#0F172A]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FACC15]" />
      </div>
    );
  }

  // Render
  return (
    <div className="min-h-screen bg-[#0F172A] pb-20 pt-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#E2E8F0]">Create Listing</h1>
            <p className="mt-2 text-sm text-[#94A3B8]">
              List your Pokemon TCG item for sale on the PokeVault marketplace.
            </p>
          </div>
          <a
            href="/sell/my-listings"
            className="inline-flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-2 text-sm font-medium text-[#94A3B8] transition-colors hover:border-[#FACC15]/30 hover:text-[#E2E8F0]"
          >
            My Listings
          </a>
        </div>

        {/* Global error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Images ── */}
          <section className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#E2E8F0]">
              <ImagePlus className="h-5 w-5 text-[#FACC15]" />
              Photos
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Upload up to {MAX_IMAGES} images. The first image will be the
              cover photo.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-[#334155] bg-[#0F172A]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={`Preview ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-[#FACC15] px-1.5 py-0.5 text-[10px] font-bold text-[#0F172A]">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1.5 top-1.5 hidden rounded-full bg-red-600 p-1 text-white group-hover:block"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#334155] bg-[#0F172A] text-[#94A3B8] transition-colors hover:border-[#FACC15]/40 hover:text-[#FACC15]"
                >
                  <Upload className="h-6 w-6" />
                  <span className="text-xs font-medium">Add Photo</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />

            {fieldErrors.images && (
              <p className="mt-2 text-sm text-red-400">{fieldErrors.images}</p>
            )}
          </section>

          {/* ── Basic Info ── */}
          <section className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#E2E8F0]">
              <Package className="h-5 w-5 text-[#FACC15]" />
              Item Details
            </h2>

            <div className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-[#E2E8F0]">
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Charizard VMAX Secret Rainbow Rare"
                  className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none transition-colors focus:border-[#FACC15]/50"
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-[#E2E8F0]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe your item — condition notes, centering, any defects..."
                  className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none transition-colors focus:border-[#FACC15]/50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-[#E2E8F0]">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.display_name}
                    </option>
                  ))}
                </select>
                {fieldErrors.categoryId && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldErrors.categoryId}
                  </p>
                )}
              </div>

              {/* Condition & Language */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-[#E2E8F0]">
                    Condition <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50"
                  >
                    <option value="">Select condition</option>
                    {CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.condition && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldErrors.condition}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#E2E8F0]">
                    Language <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50"
                  >
                    {CARD_LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.language && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldErrors.language}
                    </p>
                  )}
                </div>
              </div>

              {/* Grading toggle */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      isGraded ? "bg-[#FACC15]" : "bg-[#334155]"
                    }`}
                    onClick={() => setIsGraded(!isGraded)}
                  >
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        isGraded ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium text-[#E2E8F0]">
                    Professionally graded
                  </span>
                </label>
              </div>

              {/* Grading details */}
              {isGraded && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-[#E2E8F0]">
                      Grading Company <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={gradingCompany}
                      onChange={(e) => setGradingCompany(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50"
                    >
                      <option value="">Select</option>
                      {GRADING_COMPANIES.map((gc) => (
                        <option key={gc.value} value={gc.value}>
                          {gc.label}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.gradingCompany && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldErrors.gradingCompany}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E2E8F0]">
                      Grade <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="10"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      placeholder="e.g. 9.5"
                      className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none transition-colors focus:border-[#FACC15]/50"
                    />
                    {fieldErrors.grade && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldErrors.grade}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#E2E8F0]">
                      Cert Number
                    </label>
                    <input
                      type="text"
                      value={certNumber}
                      onChange={(e) => setCertNumber(e.target.value)}
                      placeholder="Optional"
                      className="mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-2.5 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none transition-colors focus:border-[#FACC15]/50"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Pricing ── */}
          <section className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#E2E8F0]">
              <DollarSign className="h-5 w-5 text-[#FACC15]" />
              Pricing
            </h2>

            <div className="mt-4">
              <label className="block text-sm font-medium text-[#E2E8F0]">
                Price (&euro;) <span className="text-red-400">*</span>
              </label>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">
                  &euro;
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-8 pr-4 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none transition-colors focus:border-[#FACC15]/50"
                />
              </div>
              {fieldErrors.price && (
                <p className="mt-1 text-sm text-red-400">
                  {fieldErrors.price}
                </p>
              )}
              <p className="mt-2 flex items-start gap-1.5 text-xs text-[#94A3B8]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                This will be the buy-now price for your listing.
              </p>
            </div>
          </section>

          {/* ── Submit ── */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-[#334155] bg-[#1E293B] px-6 py-2.5 text-sm font-medium text-[#94A3B8] transition-colors hover:border-[#FACC15]/30 hover:text-[#E2E8F0]"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-8 py-2.5 text-sm font-bold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Create Listing
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
