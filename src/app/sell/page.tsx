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
  Search,
} from "lucide-react";

const MAX_IMAGES = 8;
const MIN_IMAGES = 1;

interface ImagePreview {
  file: File;
  url: string;
}

interface CardSearchResult {
  external_id: string;
  name: string;
  number: string | null;
  rarity: string | null;
  supertype: string | null;
  subtypes: string[] | null;
  hp: string | null;
  types: string[] | null;
  artist: string | null;
  image_small: string | null;
  image_large: string | null;
  set: {
    external_id: string | null;
    name: string | null;
    series: string | null;
    release_date: string | null;
    total_cards: number | null;
    logo_url: string | null;
    symbol_url: string | null;
  };
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

  // Pokemon card search
  const [cardSearch, setCardSearch] = useState("");
  const [cardResults, setCardResults] = useState<CardSearchResult[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardSearchResult | null>(null);
  const [pokemonCardId, setPokemonCardId] = useState<string | null>(null);
  const [cardSearchLoading, setCardSearchLoading] = useState(false);
  const [showCardDropdown, setShowCardDropdown] = useState(false);

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

  // Pokemon card search with debounce
  useEffect(() => {
    if (cardSearch.length < 2) {
      setCardResults([]);
      setShowCardDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCardSearchLoading(true);
      try {
        const res = await fetch(
          `/api/pokemon/search?q=${encodeURIComponent(cardSearch)}`
        );
        const json = await res.json();
        setCardResults(json.cards ?? []);
        setShowCardDropdown(true);
      } catch {
        setCardResults([]);
      }
      setCardSearchLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [cardSearch]);

  const handleCardSelect = useCallback(
    async (card: CardSearchResult) => {
      setSelectedCard(card);
      setShowCardDropdown(false);
      setCardSearch("");

      // Auto-fill title if empty
      if (!title) {
        const setName = card.set?.name ?? "";
        setTitle(`${card.name} - ${setName} #${card.number}`);
      }

      // Upsert card to get local pokemon_card_id
      try {
        const res = await fetch("/api/pokemon/upsert-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ card }),
        });
        const json = await res.json();
        if (json.pokemon_card_id) {
          setPokemonCardId(json.pokemon_card_id);
        }
      } catch {
        console.error("Failed to upsert pokemon card");
      }
    },
    [title]
  );

  const handleCardClear = useCallback(() => {
    setSelectedCard(null);
    setPokemonCardId(null);
    setCardSearch("");
  }, []);

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
    if (!isGraded && !condition) errors.condition = "Please select a condition.";
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
      // 1. Upload images via server API
      const uploadedUrls: string[] = [];

      for (let i = 0; i < images.length; i++) {
        const formData = new FormData();
        formData.append("file", images[i].file);

        const uploadRes = await fetch("/api/listings/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const uploadBody = await uploadRes.json().catch(() => ({}));
          throw new Error(
            "Failed to upload image " +
              (i + 1) +
              ": " +
              (uploadBody.error || "Upload failed")
          );
        }

        const { url } = await uploadRes.json();
        uploadedUrls.push(url);
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
        pokemon_card_id: pokemonCardId || null,
        title: title.trim(),
        description: description.trim() || null,
        condition: isGraded ? null : condition || null,
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

          {/* ── Pokemon Card Search (optional) ── */}
          <section className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#E2E8F0]">
              <Search className="h-5 w-5 text-[#FACC15]" />
              Link Pokemon Card
            </h2>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Optionally link a specific Pokemon card to auto-fill details. Not
              needed for sealed products or accessories.
            </p>

            <div className="mt-4">
              {selectedCard ? (
                <div className="flex items-center gap-4 rounded-lg border border-[#FACC15]/30 bg-[#FACC15]/5 p-3">
                  {selectedCard.image_small && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedCard.image_small}
                      alt={selectedCard.name}
                      className="h-20 w-14 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#E2E8F0]">
                      {selectedCard.name}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {selectedCard.set?.name} &middot; #{selectedCard.number}
                    </p>
                    {selectedCard.rarity && (
                      <p className="text-xs text-[#94A3B8]">
                        {selectedCard.rarity}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCardClear}
                    className="shrink-0 rounded-full p-1.5 text-[#94A3B8] transition-colors hover:bg-[#0F172A] hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    onFocus={() =>
                      cardResults.length > 0 && setShowCardDropdown(true)
                    }
                    onBlur={() =>
                      setTimeout(() => setShowCardDropdown(false), 200)
                    }
                    placeholder="Search by card name (e.g. Charizard, Pikachu VMAX)..."
                    className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-10 pr-10 text-sm text-[#E2E8F0] placeholder-[#64748B] outline-none transition-colors focus:border-[#FACC15]/50"
                  />
                  {cardSearchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#94A3B8]" />
                  )}

                  {showCardDropdown && cardResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-[#334155] bg-[#1E293B] shadow-xl">
                      {cardResults.map((card) => (
                        <button
                          key={card.external_id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleCardSelect(card)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[#0F172A]/50"
                        >
                          {card.image_small && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={card.image_small}
                              alt={card.name}
                              className="h-12 w-9 rounded object-cover"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[#E2E8F0]">
                              {card.name}
                            </p>
                            <p className="text-xs text-[#94A3B8]">
                              {card.set?.name} &middot; #{card.number}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
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

              {/* Language */}
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

              {/* Grading toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsGraded(!isGraded)}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      isGraded ? "bg-[#FACC15]" : "bg-[#334155]"
                    }`}
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
                </button>
              </div>

              {/* Condition (shown when NOT graded) */}
              {!isGraded && (
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
              )}

              {/* Grading details (shown when graded) */}
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
