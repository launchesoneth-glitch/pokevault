"use client";

import { useRouter } from "next/navigation";

interface SortSelectProps {
  defaultValue: string;
  basePath: string;
  options: { value: string; label: string }[];
}

export function SortSelect({ defaultValue, basePath, options }: SortSelectProps) {
  const router = useRouter();

  return (
    <select
      defaultValue={defaultValue}
      onChange={(e) => {
        const url = new URL(window.location.href);
        url.searchParams.set("sort", e.target.value);
        url.searchParams.delete("page");
        router.push(url.pathname + url.search);
      }}
      className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
