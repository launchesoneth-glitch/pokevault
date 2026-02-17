"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Upload,
  X,
  GripVertical,
  Search,
  ChevronDown,
  Loader2,
  ImagePlus,
  Gavel,
  ShoppingBag,
  Tag,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

interface ConsignmentOption {
  id: string;
  label: string;
}

interface PokemonCardResult {
  id: string;
  name: string;
  set: string;
  number: string;
  image_url?: string;
}

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

type ListingType = "auction" | "buy_now" | "auction_with_buy_now";

const LISTING_TYPES: { value: ListingType; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: "auction",
    label: "Auction",
    icon: Gavel,
    description: "Buyers bid competitively over a set time period.",
  },
  {
    value: "buy_now",
    label: "Buy Now",
    icon: ShoppingBag,
    description: "Fixed price listing with optional offers.",
  },
  {
    value: "auction_with_buy_now",
    label: "Auction + Buy Now",
    icon: Tag,
    description: "Auction with an optional instant-purchase price.",
  },
];

const AUCTION_DURATIONS = [
  { value: "1", label: "1 Day" },
  { value: "3", label: "3 Days" },
  { value: "5", label: "5 Days" },
  { value: "7", label: "7 Days" },
];

const CONDITIONS = [
  "Mint",
  "Near Mint",
  "Lightly Played",
  "Moderately Played",
  "Heavily Played",
  "Damaged",
];

const LANGUAGES = [
  "English",
  "Japanese",
  "Korean",
  "Chinese (Simplified)",
  "Chinese (Traditional)",
  "French",
  "German",
  "Italian",
  "Spanish",
  "Portuguese",
  "Thai",
  "Indonesian",
];

const CATEGORIES = [
  "Single Card",
  "Sealed Product",
  "Booster Box",
  "Elite Trainer Box",
  "Collection Box",
  "Tin",
  "Blister Pack",
  "Theme Deck",
  "Accessories",
  "Lot / Bundle",
  "Graded Card",
  "Other",
];

export default function CreateListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill consignment_id from URL params
  const prefillConsignmentId = searchParams.get("consignment_id") ?? "";

  // Form state
  const [consignmentId, setConsignmentId] = useState(prefillConsignmentId);
  const [consignmentOptions, setConsignmentOptions] = useState<ConsignmentOption[]>([]);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [language, setLanguage] = useState("English");
  const [listingType, setListingType] = useState<ListingType>("auction");

  // Pokemon card search
  const [cardSearch, setCardSearch] = useState("");
  const [cardResults, setCardResults] = useState<PokemonCardResult[]>([]);
  const [selectedCard, setSelectedCard] = useState<PokemonCardResult | null>(null);
  const [cardSearchLoading, setCardSearchLoading] = useState(false);
  const [showCardDropdown, setShowCardDropdown] = useState(false);

  // Grading
  const [isGraded, setIsGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState("");
  const [gradeValue, setGradeValue] = useState("");
  const [certNumber, setCertNumber] = useState("");

  // Auction fields
  const [startingPrice, setStartingPrice] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [auctionDuration, setAuctionDuration] = useState("7");

  // Buy now fields
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [offersEnabled, setOffersEnabled] = useState(false);
  const [minimumOffer, setMinimumOffer] = useState("");

  // Images
  const [images, setImages] = useState<ImageFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Fetch consignment options
  useEffect(() => {
    async function fetchConsignments() {
      const { data } = await supabase
        .from("consignments")
        .select("id, consigner:profiles!consignments_user_id_fkey(username)")
        .in("status", ["received", "processing"])
        .order("created_at", { ascending: false });

      if (data) {
        setConsignmentOptions(
          data.map((c: any) => ({
            id: c.id,
            label: `${c.id.slice(0, 8)}... - ${c.consigner?.username ?? "Unknown"}`,
          }))
        );
      }
    }
    fetchConsignments();
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
        const response = await fetch(
          `https://api.pokemontcg.io/v2/cards?q=name:${encodeURIComponent(cardSearch)}*&pageSize=10&select=id,name,set,number,images`
        );
        const json = await response.json();
        const results: PokemonCardResult[] = (json.data ?? []).map(
          (card: any) => ({
            id: card.id,
            name: card.name,
            set: card.set?.name ?? "",
            number: card.number,
            image_url: card.images?.small,
          })
        );
        setCardResults(results);
        setShowCardDropdown(true);
      } catch {
        setCardResults([]);
      }
      setCardSearchLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [cardSearch]);

  // Image handling
  function handleFiles(files: FileList | File[]) {
    const newImages: ImageFile[] = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
      }));
    setImages((prev) => [...prev, ...newImages]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  // Drag-and-drop reorder
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDragIndex(index);
  }

  function handleDragEnd() {
    setDragIndex(null);
  }

  // Submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      // Upload images first
      const imageUrls: string[] = [];
      for (const img of images) {
        const ext = img.file.name.split(".").pop() ?? "jpg";
        const path = `listings/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, img.file);
        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
        const { data: urlData } = supabase.storage
          .from("listing-images")
          .getPublicUrl(path);
        imageUrls.push(urlData.publicUrl);
      }

      // Build payload
      const payload: Record<string, any> = {
        consignment_id: consignmentId || null,
        category,
        title,
        description,
        condition,
        language,
        listing_type: listingType,
        images: imageUrls,
        pokemon_card_id: selectedCard?.id ?? null,
        pokemon_card_name: selectedCard?.name ?? null,
        is_graded: isGraded,
      };

      if (isGraded) {
        payload.grading_company = gradingCompany;
        payload.grade_value = gradeValue;
        payload.cert_number = certNumber;
      }

      if (listingType === "auction" || listingType === "auction_with_buy_now") {
        payload.starting_price = parseFloat(startingPrice);
        payload.reserve_price = reservePrice ? parseFloat(reservePrice) : null;
        payload.auction_duration_days = parseInt(auctionDuration, 10);
      }

      if (listingType === "buy_now" || listingType === "auction_with_buy_now") {
        payload.buy_now_price = parseFloat(buyNowPrice);
      }

      if (listingType === "buy_now") {
        payload.offers_enabled = offersEnabled;
        payload.minimum_offer = offersEnabled && minimumOffer
          ? parseFloat(minimumOffer)
          : null;
      }

      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Failed to create listing");
      }

      router.push("/admin/listings");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/listings"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#334155] text-[#94A3B8] transition-colors hover:border-[#FACC15]/40 hover:text-[#FACC15]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-bold text-[#E2E8F0]">Create Listing</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Create a new marketplace listing from a consignment.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#EF4444]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Consignment and Category */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[#E2E8F0]">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Consignment dropdown */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                Consignment
              </label>
              <select
                value={consignmentId}
                onChange={(e) => setConsignmentId(e.target.value)}
                className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
              >
                <option value="">No consignment (admin listing)</option>
                {consignmentOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                Category <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
              >
                <option value="" disabled>
                  Select category
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Pokemon card search */}
            <div className="relative sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                Pokemon Card
              </label>
              {selectedCard ? (
                <div className="flex items-center gap-3 rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5">
                  {selectedCard.image_url && (
                    <img
                      src={selectedCard.image_url}
                      alt={selectedCard.name}
                      className="h-10 w-8 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#E2E8F0]">
                      {selectedCard.name}
                    </p>
                    <p className="text-xs text-[#94A3B8]">
                      {selectedCard.set} &middot; #{selectedCard.number}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCard(null);
                      setCardSearch("");
                    }}
                    className="text-[#94A3B8] transition-colors hover:text-[#EF4444]"
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
                    onFocus={() => cardResults.length > 0 && setShowCardDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCardDropdown(false), 200)}
                    placeholder="Search for a Pokemon card..."
                    className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-10 pr-10 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                  />
                  {cardSearchLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#94A3B8]" />
                  )}

                  {showCardDropdown && cardResults.length > 0 && (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#334155] bg-[#1E293B] shadow-xl">
                      {cardResults.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSelectedCard(card);
                            setShowCardDropdown(false);
                            setCardSearch("");
                            if (!title) {
                              setTitle(`${card.name} - ${card.set} #${card.number}`);
                            }
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[#0F172A]/50"
                        >
                          {card.image_url && (
                            <img
                              src={card.image_url}
                              alt={card.name}
                              className="h-10 w-8 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium text-[#E2E8F0]">
                              {card.name}
                            </p>
                            <p className="text-xs text-[#94A3B8]">
                              {card.set} &middot; #{card.number}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                Title <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., Charizard VMAX 074/073 Champions Path"
                className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the item in detail..."
                className="w-full resize-none rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
              />
            </div>

            {/* Condition */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                Condition <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                required
                className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
              >
                <option value="" disabled>
                  Select condition
                </option>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grading Info */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#E2E8F0]">
              Grading Information
            </h3>
            <label className="flex cursor-pointer items-center gap-2">
              <span className="text-sm text-[#94A3B8]">Graded?</span>
              <button
                type="button"
                role="switch"
                aria-checked={isGraded}
                onClick={() => setIsGraded(!isGraded)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  isGraded ? "bg-[#FACC15]" : "bg-[#334155]"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    isGraded ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>

          {isGraded && (
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                  Grading Company <span className="text-[#EF4444]">*</span>
                </label>
                <select
                  value={gradingCompany}
                  onChange={(e) => setGradingCompany(e.target.value)}
                  required={isGraded}
                  className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                >
                  <option value="" disabled>
                    Select company
                  </option>
                  <option value="PSA">PSA</option>
                  <option value="BGS">BGS (Beckett)</option>
                  <option value="CGC">CGC</option>
                  <option value="SGC">SGC</option>
                  <option value="ACE">ACE Grading</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                  Grade <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  required={isGraded}
                  placeholder="e.g., 10, 9.5, 8"
                  className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                  Cert Number
                </label>
                <input
                  type="text"
                  value={certNumber}
                  onChange={(e) => setCertNumber(e.target.value)}
                  placeholder="Certificate number"
                  className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                />
              </div>
            </div>
          )}
        </div>

        {/* Listing Type */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[#E2E8F0]">
            Listing Type
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {LISTING_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setListingType(type.value)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
                  listingType === type.value
                    ? "border-[#FACC15] bg-[#FACC15]/10"
                    : "border-[#334155] hover:border-[#94A3B8]/50"
                }`}
              >
                <type.icon
                  className={`h-6 w-6 ${
                    listingType === type.value
                      ? "text-[#FACC15]"
                      : "text-[#94A3B8]"
                  }`}
                />
                <span
                  className={`text-sm font-semibold ${
                    listingType === type.value
                      ? "text-[#FACC15]"
                      : "text-[#E2E8F0]"
                  }`}
                >
                  {type.label}
                </span>
                <span className="text-xs text-[#94A3B8]">
                  {type.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[#E2E8F0]">
            Pricing
          </h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Auction fields */}
            {(listingType === "auction" ||
              listingType === "auction_with_buy_now") && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                    Starting Price <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(e.target.value)}
                      required
                      placeholder="0.00"
                      className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-7 pr-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                    Reserve Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={reservePrice}
                      onChange={(e) => setReservePrice(e.target.value)}
                      placeholder="Optional"
                      className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-7 pr-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                    Auction Duration <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={auctionDuration}
                    onChange={(e) => setAuctionDuration(e.target.value)}
                    className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-3 py-2.5 text-sm text-[#E2E8F0] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                  >
                    {AUCTION_DURATIONS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Buy now fields */}
            {(listingType === "buy_now" ||
              listingType === "auction_with_buy_now") && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                  Buy Now Price <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={buyNowPrice}
                    onChange={(e) => setBuyNowPrice(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-7 pr-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                  />
                </div>
              </div>
            )}

            {/* Offers (buy_now only) */}
            {listingType === "buy_now" && (
              <>
                <div className="flex items-end sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={offersEnabled}
                      onClick={() => setOffersEnabled(!offersEnabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${
                        offersEnabled ? "bg-[#FACC15]" : "bg-[#334155]"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                          offersEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span className="text-sm font-medium text-[#E2E8F0]">
                      Allow offers from buyers
                    </span>
                  </label>
                </div>

                {offersEnabled && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[#94A3B8]">
                      Minimum Offer
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#94A3B8]">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={minimumOffer}
                        onChange={(e) => setMinimumOffer(e.target.value)}
                        placeholder="Optional minimum"
                        className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-2.5 pl-7 pr-3 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[#E2E8F0]">
            Images
          </h3>
          <p className="mb-4 text-sm text-[#94A3B8]">
            Upload multiple images. Drag to reorder. First image is the cover
            photo.
          </p>

          {/* Drag and drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
              dragOver
                ? "border-[#FACC15] bg-[#FACC15]/5"
                : "border-[#334155] hover:border-[#94A3B8]/50"
            }`}
          >
            <ImagePlus
              className={`h-10 w-10 ${
                dragOver ? "text-[#FACC15]" : "text-[#94A3B8]"
              }`}
            />
            <p className="mt-3 text-sm font-medium text-[#E2E8F0]">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-[#94A3B8]">
              PNG, JPG, WEBP up to 10MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
              className="hidden"
            />
          </div>

          {/* Image preview grid */}
          {images.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                    index === 0
                      ? "border-[#FACC15]"
                      : "border-[#334155]"
                  } ${dragIndex === index ? "opacity-50" : ""}`}
                >
                  <img
                    src={img.preview}
                    alt={`Upload ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <GripVertical className="h-5 w-5 text-white" />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#EF4444] text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-[#FACC15] px-1.5 py-0.5 text-[10px] font-bold text-[#0F172A]">
                      COVER
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 border-t border-[#334155] pt-6">
          <Link
            href="/admin/listings"
            className="rounded-lg border border-[#334155] px-6 py-2.5 text-sm font-medium text-[#94A3B8] transition-colors hover:border-[#94A3B8]/50 hover:text-[#E2E8F0]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-6 py-2.5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90 disabled:opacity-50"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Creating..." : "Create Listing"}
          </button>
        </div>
      </form>
    </div>
  );
}
