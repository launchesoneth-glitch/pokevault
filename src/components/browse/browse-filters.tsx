"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { CONDITIONS, GRADING_COMPANIES } from "@/lib/constants";

const CATEGORIES = [
  { value: "graded_cards", label: "Graded Cards" },
  { value: "sealed_product", label: "Sealed Product" },
] as const;

const LISTING_TYPES = [
  { value: "auction", label: "Auction" },
  { value: "buy_now", label: "Buy Now" },
] as const;

const SORT_OPTIONS = [
  { value: "ending_soon", label: "Ending Soon" },
  { value: "newly_listed", label: "Newly Listed" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "most_bids", label: "Most Bids" },
  { value: "most_watched", label: "Most Watched" },
] as const;

export function BrowseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Read current filter state from URL
  const selectedCategories = searchParams.get("category")?.split(",") ?? [];
  const selectedType = searchParams.get("type") ?? "";
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const selectedCondition = searchParams.get("condition") ?? "";
  const selectedGradingCompanies =
    searchParams.get("gradingCompany")?.split(",") ?? [];
  const selectedSort = searchParams.get("sort") ?? "newly_listed";
  const searchQuery = searchParams.get("search") ?? "";

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      // Reset to page 1 on any filter change
      params.delete("page");

      startTransition(() => {
        router.push(`/browse?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  function toggleCategory(value: string) {
    const current = new Set(selectedCategories.filter(Boolean));
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    updateParams({
      category: current.size > 0 ? Array.from(current).join(",") : null,
    });
  }

  function toggleGradingCompany(value: string) {
    const current = new Set(selectedGradingCompanies.filter(Boolean));
    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }
    updateParams({
      gradingCompany: current.size > 0 ? Array.from(current).join(",") : null,
    });
  }

  function handleTypeChange(value: string) {
    updateParams({ type: value === selectedType ? null : value });
  }

  function clearAllFilters() {
    startTransition(() => {
      router.push("/browse");
    });
  }

  const hasActiveFilters =
    selectedCategories.filter(Boolean).length > 0 ||
    selectedType !== "" ||
    minPrice !== "" ||
    maxPrice !== "" ||
    selectedCondition !== "" ||
    selectedGradingCompanies.filter(Boolean).length > 0 ||
    searchQuery !== "";

  const filterContent = (
    <div className="space-y-6">
      {/* Search */}
      <FilterSection title="Search">
        <div className="relative">
          <input
            type="text"
            placeholder="Search listings..."
            defaultValue={searchQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const value = (e.target as HTMLInputElement).value;
                updateParams({ search: value || null });
              }
            }}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </FilterSection>

      {/* Sort */}
      <FilterSection title="Sort By">
        <select
          value={selectedSort}
          onChange={(e) => updateParams({ sort: e.target.value })}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Category */}
      <FilterSection title="Category">
        <div className="space-y-2">
          {CATEGORIES.map((category) => (
            <label
              key={category.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-accent"
            >
              <input
                type="checkbox"
                checked={selectedCategories.includes(category.value)}
                onChange={() => toggleCategory(category.value)}
                className="h-4 w-4 rounded border-border bg-background text-accent focus:ring-accent focus:ring-offset-0"
              />
              {category.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Listing Type */}
      <FilterSection title="Listing Type">
        <div className="space-y-2">
          {LISTING_TYPES.map((type) => (
            <label
              key={type.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-accent"
            >
              <input
                type="radio"
                name="listing_type"
                checked={selectedType === type.value}
                onChange={() => handleTypeChange(type.value)}
                className="h-4 w-4 border-border bg-background text-accent focus:ring-accent focus:ring-offset-0"
              />
              {type.label}
            </label>
          ))}
          {selectedType && (
            <button
              onClick={() => updateParams({ type: null })}
              className="text-xs text-muted transition-colors hover:text-accent"
            >
              Clear selection
            </button>
          )}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
              &euro;
            </span>
            <input
              type="number"
              placeholder="Min"
              min="0"
              step="0.01"
              defaultValue={minPrice}
              onBlur={(e) =>
                updateParams({ minPrice: e.target.value || null })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateParams({
                    minPrice:
                      (e.target as HTMLInputElement).value || null,
                  });
                }
              }}
              className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <span className="text-muted">-</span>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted">
              &euro;
            </span>
            <input
              type="number"
              placeholder="Max"
              min="0"
              step="0.01"
              defaultValue={maxPrice}
              onBlur={(e) =>
                updateParams({ maxPrice: e.target.value || null })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateParams({
                    maxPrice:
                      (e.target as HTMLInputElement).value || null,
                  });
                }
              }}
              className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      </FilterSection>

      {/* Condition */}
      <FilterSection title="Condition">
        <select
          value={selectedCondition}
          onChange={(e) =>
            updateParams({ condition: e.target.value || null })
          }
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">All Conditions</option>
          {CONDITIONS.map((condition) => (
            <option key={condition.value} value={condition.value}>
              {condition.label}
            </option>
          ))}
        </select>
      </FilterSection>

      {/* Grading Company */}
      <FilterSection title="Grading Company">
        <div className="space-y-2">
          {GRADING_COMPANIES.map((company) => (
            <label
              key={company.value}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground transition-colors hover:text-accent"
            >
              <input
                type="checkbox"
                checked={selectedGradingCompanies.includes(company.value)}
                onChange={() => toggleGradingCompany(company.value)}
                className="h-4 w-4 rounded border-border bg-background text-accent focus:ring-accent focus:ring-offset-0"
              />
              {company.label}
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Clear All */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="w-full rounded-lg border border-pokered/50 bg-pokered/10 px-4 py-2 text-sm font-medium text-pokered transition-colors hover:bg-pokered/20"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Filter Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex w-full items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent/50"
        >
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-background">
                !
              </span>
            )}
          </span>
          {mobileOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {mobileOpen && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            {filterContent}
          </div>
        )}
      </div>

      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="sticky top-24 rounded-xl border border-border bg-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Filters
            </h2>
            {isPending && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            )}
          </div>
          {filterContent}
        </div>
      </div>
    </>
  );
}

/** Collapsible section wrapper used inside the filter panel. */
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
      >
        {title}
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted" />
        )}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}
