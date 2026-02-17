// @ts-nocheck
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package,
  CreditCard,
  Box,
  Camera,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Search,
  ImagePlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CONDITIONS, GRADING_COMPANIES } from "@/lib/constants";

type Category = "raw_single" | "graded_card" | "sealed_product";

interface FormData {
  category: Category | null;
  cardName: string;
  setName: string;
  condition: string;
  gradingCompany: string;
  gradeValue: string;
  certNumber: string;
  photos: File[];
  photoPreviews: string[];
  quantity: number;
  notes: string;
  estimatedValue: string;
}

const INITIAL_FORM: FormData = {
  category: null,
  cardName: "",
  setName: "",
  condition: "",
  gradingCompany: "",
  gradeValue: "",
  certNumber: "",
  photos: [],
  photoPreviews: [],
  quantity: 1,
  notes: "",
  estimatedValue: "",
};

const CATEGORIES = [
  {
    value: "raw_single" as Category,
    label: "Raw Single",
    description: "Ungraded individual cards",
    icon: CreditCard,
    commission: "15%",
  },
  {
    value: "graded_card" as Category,
    label: "Graded Card",
    description: "Professionally graded slabs",
    icon: Package,
    commission: "12%",
  },
  {
    value: "sealed_product" as Category,
    label: "Sealed Product",
    description: "Factory sealed boxes, packs, ETBs",
    icon: Box,
    commission: "10%",
  },
];

const STEPS = [
  { label: "Category", shortLabel: "Type" },
  { label: "Card Details", shortLabel: "Details" },
  { label: "Photos & Info", shortLabel: "Photos" },
  { label: "Review", shortLabel: "Review" },
];

const POPULAR_SETS = [
  "Base Set",
  "Jungle",
  "Fossil",
  "Team Rocket",
  "Gym Heroes",
  "Gym Challenge",
  "Neo Genesis",
  "Neo Discovery",
  "Neo Revelation",
  "Neo Destiny",
  "Expedition",
  "Aquapolis",
  "Skyridge",
  "EX Ruby & Sapphire",
  "EX Sandstorm",
  "EX Dragon",
  "Diamond & Pearl",
  "Platinum",
  "HeartGold SoulSilver",
  "Black & White",
  "XY",
  "Sun & Moon",
  "Sword & Shield",
  "Scarlet & Violet",
  "Prismatic Evolutions",
  "Surging Sparks",
  "Stellar Crown",
  "Shrouded Fable",
  "Twilight Masquerade",
  "Temporal Forces",
  "Paldean Fates",
  "Obsidian Flames",
  "Paldea Evolved",
  "151",
  "Crown Zenith",
  "Silver Tempest",
  "Lost Origin",
  "Astral Radiance",
  "Brilliant Stars",
  "Fusion Strike",
  "Evolving Skies",
  "Chilling Reign",
  "Battle Styles",
  "Shining Fates",
  "Vivid Voltage",
  "Champion's Path",
  "Darkness Ablaze",
  "Rebel Clash",
  "Hidden Fates",
  "Cosmic Eclipse",
  "Unified Minds",
  "Unbroken Bonds",
  "Team Up",
  "Lost Thunder",
  "Celebrations",
];

export default function ConsignSubmitPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [consignmentId, setConsignmentId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search results on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Card name search with debounce
  const handleCardSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setForm((prev) => ({ ...prev, cardName: query }));

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("cards")
          .select("name")
          .ilike("name", `%${query}%`)
          .limit(10);

        if (data && data.length > 0) {
          const names = [...new Set(data.map((c: { name: string }) => c.name))];
          setSearchResults(names);
        } else {
          setSearchResults([]);
        }
        setShowSearchResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const selectSearchResult = (name: string) => {
    setForm((prev) => ({ ...prev, cardName: name }));
    setSearchQuery(name);
    setShowSearchResults(false);
  };

  // Photo handling
  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      addPhotos(files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.photos]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files).filter((f) =>
          f.type.startsWith("image/")
        );
        addPhotos(files);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.photos]
  );

  const addPhotos = (files: File[]) => {
    const maxPhotos = 8;
    const remaining = maxPhotos - form.photos.length;
    const newFiles = files.slice(0, remaining);

    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));

    setForm((prev) => ({
      ...prev,
      photos: [...prev.photos, ...newFiles],
      photoPreviews: [...prev.photoPreviews, ...newPreviews],
    }));
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(form.photoPreviews[index]);
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
      photoPreviews: prev.photoPreviews.filter((_, i) => i !== index),
    }));
  };

  // Validation
  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return form.category !== null;
      case 1:
        if (!form.cardName.trim()) return false;
        if (form.category === "raw_single" && !form.condition) return false;
        if (form.category === "graded_card" && (!form.gradingCompany || !form.gradeValue))
          return false;
        return true;
      case 2:
        return form.photos.length >= 1 && !!form.estimatedValue;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = new FormData();
      payload.append("category", form.category!);
      payload.append("card_name", form.cardName);
      payload.append("set_name", form.setName);
      payload.append("quantity", String(form.quantity));
      payload.append("notes", form.notes);
      payload.append("estimated_value", form.estimatedValue);

      if (form.category === "raw_single") {
        payload.append("condition", form.condition);
      } else if (form.category === "graded_card") {
        payload.append("grading_company", form.gradingCompany);
        payload.append("grade_value", form.gradeValue);
        payload.append("cert_number", form.certNumber);
      }

      form.photos.forEach((photo) => {
        payload.append("photos", photo);
      });

      const response = await fetch("/api/consignments", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit consignment");
      }

      const data = await response.json();
      setConsignmentId(data.id);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (consignmentId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 text-[#E2E8F0]">
        <div className="w-full max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#22C55E]/20">
            <CheckCircle2 className="h-10 w-10 text-[#22C55E]" />
          </div>
          <h1 className="text-3xl font-bold">Consignment Submitted!</h1>
          <p className="mt-3 text-[#94A3B8]">
            Your consignment has been received and is pending review.
          </p>
          <div className="mt-6 rounded-xl border border-[#334155] bg-[#1E293B] p-6">
            <p className="text-sm text-[#94A3B8]">Consignment ID</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#FACC15]">
              {consignmentId}
            </p>
          </div>
          <p className="mt-4 text-sm text-[#94A3B8]">
            Save this ID for your records. You can track your consignment status
            at any time.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/consign/my-consignments"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FACC15] px-6 py-3 font-semibold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90"
            >
              Track Consignment
            </Link>
            <Link
              href="/consign/submit"
              onClick={() => {
                setForm(INITIAL_FORM);
                setStep(0);
                setConsignmentId(null);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-6 py-3 font-semibold transition-colors hover:border-[#FACC15]/50"
            >
              Submit Another
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/consign"
            className="inline-flex items-center gap-1 text-sm text-[#94A3B8] transition-colors hover:text-[#FACC15]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Consignment Info
          </Link>
          <h1 className="mt-4 text-3xl font-bold">Submit a Consignment</h1>
          <p className="mt-1 text-[#94A3B8]">
            Fill in the details below to consign your cards with PokeVault.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                      i < step
                        ? "border-[#22C55E] bg-[#22C55E] text-[#0F172A]"
                        : i === step
                          ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]"
                          : "border-[#334155] bg-[#1E293B] text-[#94A3B8]"
                    }`}
                  >
                    {i < step ? <Check className="h-5 w-5" /> : i + 1}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium ${
                      i <= step ? "text-[#E2E8F0]" : "text-[#94A3B8]"
                    }`}
                  >
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{s.shortLabel}</span>
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-2 h-0.5 w-8 sm:w-16 lg:w-24 ${
                      i < step ? "bg-[#22C55E]" : "bg-[#334155]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Steps */}
        <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-6 sm:p-8">
          {/* Step 1: Category Selection */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-semibold">
                What are you consigning?
              </h2>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Select the category that best describes your item.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = form.category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, category: cat.value }))
                      }
                      className={`group relative flex flex-col items-center rounded-xl border-2 p-6 text-center transition-all ${
                        isSelected
                          ? "border-[#FACC15] bg-[#FACC15]/5 shadow-lg shadow-[#FACC15]/10"
                          : "border-[#334155] bg-[#0F172A] hover:border-[#94A3B8]/50"
                      }`}
                    >
                      <div
                        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl transition-colors ${
                          isSelected
                            ? "bg-[#FACC15]/20 text-[#FACC15]"
                            : "bg-[#334155]/50 text-[#94A3B8] group-hover:text-[#E2E8F0]"
                        }`}
                      >
                        <Icon className="h-7 w-7" />
                      </div>
                      <h3 className="font-semibold">{cat.label}</h3>
                      <p className="mt-1 text-sm text-[#94A3B8]">
                        {cat.description}
                      </p>
                      <span
                        className={`mt-3 rounded-full px-3 py-1 text-xs font-medium ${
                          isSelected
                            ? "bg-[#FACC15]/20 text-[#FACC15]"
                            : "bg-[#334155]/50 text-[#94A3B8]"
                        }`}
                      >
                        {cat.commission} commission
                      </span>
                      {isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#FACC15]">
                          <Check className="h-4 w-4 text-[#0F172A]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Card Details */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold">Card Details</h2>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Provide information about your{" "}
                {form.category === "raw_single"
                  ? "card"
                  : form.category === "graded_card"
                    ? "graded card"
                    : "sealed product"}
                .
              </p>

              <div className="mt-8 space-y-6">
                {/* Card Name with Autocomplete */}
                <div ref={searchContainerRef} className="relative">
                  <label className="mb-2 block text-sm font-medium">
                    {form.category === "sealed_product"
                      ? "Product Name"
                      : "Card Name"}{" "}
                    <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleCardSearch(e.target.value)}
                      onFocus={() =>
                        searchResults.length > 0 && setShowSearchResults(true)
                      }
                      placeholder={
                        form.category === "sealed_product"
                          ? 'e.g., "Scarlet & Violet Booster Box"'
                          : 'e.g., "Charizard VMAX"'
                      }
                      className="w-full rounded-lg border border-[#334155] bg-[#0F172A] py-3 pl-10 pr-4 text-[#E2E8F0] placeholder-[#94A3B8]/50 transition-colors focus:border-[#FACC15] focus:outline-none focus:ring-1 focus:ring-[#FACC15]"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-[#94A3B8]" />
                    )}
                  </div>
                  {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-[#334155] bg-[#0F172A] py-1 shadow-xl">
                      {searchResults.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => selectSearchResult(name)}
                          className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#1E293B]"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Set Selection */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Set / Product Line
                  </label>
                  <select
                    value={form.setName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, setName: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-3 text-[#E2E8F0] transition-colors focus:border-[#FACC15] focus:outline-none focus:ring-1 focus:ring-[#FACC15]"
                  >
                    <option value="">Select a set...</option>
                    {POPULAR_SETS.map((set) => (
                      <option key={set} value={set}>
                        {set}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Condition (Raw) */}
                {form.category === "raw_single" && (
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      Condition <span className="text-[#EF4444]">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {CONDITIONS.map((condition) => (
                        <button
                          key={(condition as any)?.value ?? condition}
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, condition }))
                          }
                          className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                            form.condition === condition
                              ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]"
                              : "border-[#334155] bg-[#0F172A] text-[#94A3B8] hover:border-[#94A3B8]/50 hover:text-[#E2E8F0]"
                          }`}
                        >
                          {condition}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grading (Graded) */}
                {form.category === "graded_card" && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium">
                        Grading Company{" "}
                        <span className="text-[#EF4444]">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {GRADING_COMPANIES.map((company) => (
                          <button
                            key={(company as any)?.value ?? company}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                gradingCompany: company,
                              }))
                            }
                            className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                              form.gradingCompany === company
                                ? "border-[#FACC15] bg-[#FACC15]/10 text-[#FACC15]"
                                : "border-[#334155] bg-[#0F172A] text-[#94A3B8] hover:border-[#94A3B8]/50 hover:text-[#E2E8F0]"
                            }`}
                          >
                            {company}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Grade <span className="text-[#EF4444]">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.gradeValue}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              gradeValue: e.target.value,
                            }))
                          }
                          placeholder="e.g., 10, 9.5, 9"
                          className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-3 text-[#E2E8F0] placeholder-[#94A3B8]/50 transition-colors focus:border-[#FACC15] focus:outline-none focus:ring-1 focus:ring-[#FACC15]"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Cert Number
                        </label>
                        <input
                          type="text"
                          value={form.certNumber}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              certNumber: e.target.value,
                            }))
                          }
                          placeholder="Optional"
                          className="w-full rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-3 text-[#E2E8F0] placeholder-[#94A3B8]/50 transition-colors focus:border-[#FACC15] focus:outline-none focus:ring-1 focus:ring-[#FACC15]"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Photos & Info */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold">Photos & Additional Info</h2>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Upload clear photos and provide additional details.
              </p>

              <div className="mt-8 space-y-6">
                {/* Photo Upload */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Photos <span className="text-[#EF4444]">*</span>
                    <span className="ml-2 text-xs font-normal text-[#94A3B8]">
                      ({form.photos.length}/8 uploaded)
                    </span>
                  </label>

                  {/* Drag & Drop Zone */}
                  {form.photos.length < 8 && (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                        isDragging
                          ? "border-[#FACC15] bg-[#FACC15]/5"
                          : "border-[#334155] bg-[#0F172A] hover:border-[#94A3B8]/50"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center">
                        {isDragging ? (
                          <Upload className="mb-3 h-10 w-10 text-[#FACC15]" />
                        ) : (
                          <ImagePlus className="mb-3 h-10 w-10 text-[#94A3B8]" />
                        )}
                        <p className="font-medium">
                          {isDragging
                            ? "Drop images here"
                            : "Drag & drop images here"}
                        </p>
                        <p className="mt-1 text-sm text-[#94A3B8]">
                          or click to browse. Include front, back, and close-ups
                          of any defects.
                        </p>
                        <p className="mt-2 text-xs text-[#94A3B8]">
                          PNG, JPG, WEBP up to 10MB each
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Photo Previews */}
                  {form.photoPreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-3">
                      {form.photoPreviews.map((preview, i) => (
                        <div
                          key={i}
                          className="group relative aspect-square overflow-hidden rounded-lg border border-[#334155]"
                        >
                          <img
                            src={preview}
                            alt={`Upload ${i + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(i)}
                            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#EF4444] text-white opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="w-32 rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-3 text-[#E2E8F0] transition-colors focus:border-[#FACC15] focus:outline-none focus:ring-1 focus:ring-[#FACC15]"
                  />
                </div>

                {/* Estimated Value */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Estimated Value (USD){" "}
                    <span className="text-[#EF4444]">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.estimatedValue}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, "");
                        setForm((prev) => ({
                          ...prev,
                          estimatedValue: val,
                        }));
                      }}
                      placeholder="0.00"
                      className="w-48 rounded-lg border border-[#334155] bg-[#0F172A] py-3 pl-7 pr-4 text-[#E2E8F0] placeholder-[#94A3B8]/50 transition-colors focus:border-[#FACC15] focus:outline-none focus:ring-1 focus:ring-[#FACC15]"
                    />
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-[#94A3B8]">
                    <Info className="h-3.5 w-3.5" />
                    This helps us prioritize and price your listing. Final sale
                    price is determined by auction.
                  </p>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Additional Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    rows={3}
                    placeholder="Any details about the card's history, notable features, defects, etc."
                    className="w-full resize-none rounded-lg border border-[#334155] bg-[#0F172A] px-4 py-3 text-[#E2E8F0] placeholder-[#94A3B8]/50 transition-colors focus:border-[#FACC15] focus:outline-none focus:ring-1 focus:ring-[#FACC15]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-semibold">Review & Submit</h2>
              <p className="mt-1 text-sm text-[#94A3B8]">
                Please review all details before submitting your consignment.
              </p>

              <div className="mt-8 space-y-6">
                {/* Category */}
                <div className="rounded-lg border border-[#334155] bg-[#0F172A] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Category
                  </h3>
                  <p className="mt-1 font-medium capitalize">
                    {form.category?.replace(/_/g, " ")}
                  </p>
                </div>

                {/* Card Details */}
                <div className="rounded-lg border border-[#334155] bg-[#0F172A] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Item Details
                  </h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Name</span>
                      <span className="font-medium">{form.cardName}</span>
                    </div>
                    {form.setName && (
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">Set</span>
                        <span>{form.setName}</span>
                      </div>
                    )}
                    {form.category === "raw_single" && form.condition && (
                      <div className="flex justify-between">
                        <span className="text-[#94A3B8]">Condition</span>
                        <span>{form.condition}</span>
                      </div>
                    )}
                    {form.category === "graded_card" && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Grading Company</span>
                          <span>{form.gradingCompany}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#94A3B8]">Grade</span>
                          <span>{form.gradeValue}</span>
                        </div>
                        {form.certNumber && (
                          <div className="flex justify-between">
                            <span className="text-[#94A3B8]">
                              Cert Number
                            </span>
                            <span>{form.certNumber}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Quantity</span>
                      <span>{form.quantity}</span>
                    </div>
                  </div>
                </div>

                {/* Photos */}
                <div className="rounded-lg border border-[#334155] bg-[#0F172A] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Photos ({form.photos.length})
                  </h3>
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {form.photoPreviews.map((preview, i) => (
                      <div
                        key={i}
                        className="aspect-square overflow-hidden rounded-md border border-[#334155]"
                      >
                        <img
                          src={preview}
                          alt={`Preview ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Estimated Value & Notes */}
                <div className="rounded-lg border border-[#334155] bg-[#0F172A] p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Valuation & Notes
                  </h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Estimated Value</span>
                      <span className="font-semibold text-[#22C55E]">
                        ${parseFloat(form.estimatedValue || "0").toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#94A3B8]">Commission Rate</span>
                      <span>
                        {form.category === "raw_single"
                          ? "15%"
                          : form.category === "graded_card"
                            ? "12%"
                            : "10%"}
                      </span>
                    </div>
                    {form.notes && (
                      <div className="pt-2">
                        <span className="text-[#94A3B8]">Notes:</span>
                        <p className="mt-1 text-sm">{form.notes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Error */}
                {submitError && (
                  <div className="flex items-center gap-3 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 p-4 text-sm text-[#EF4444]">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {submitError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-[#334155] pt-6">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-[#334155] bg-[#0F172A] px-5 py-2.5 text-sm font-medium text-[#E2E8F0] transition-colors hover:border-[#94A3B8]/50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={!canProceed()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#22C55E]/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Submit Consignment
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
