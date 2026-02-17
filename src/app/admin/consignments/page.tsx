"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  PackageSearch,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import type { Database } from "@/types/database";

type Consignment = Database["public"]["Tables"]["consignments"]["Row"] & {
  consigner?: { username: string; email: string } | null;
};

const STATUS_OPTIONS = [
  "pending",
  "shipped_to_us",
  "received",
  "processing",
  "listed",
  "sold",
  "disputed",
] as const;

const STATUS_TABS = [
  "all",
  "pending",
  "shipped_to_us",
  "received",
  "processing",
  "listed",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string }> = {
    pending: { bg: "bg-[#F59E0B]/15", text: "text-[#F59E0B]" },
    shipped_to_us: { bg: "bg-[#3B82F6]/15", text: "text-[#3B82F6]" },
    received: { bg: "bg-[#FACC15]/15", text: "text-[#FACC15]" },
    processing: { bg: "bg-[#94A3B8]/15", text: "text-[#94A3B8]" },
    listed: { bg: "bg-[#22C55E]/15", text: "text-[#22C55E]" },
    sold: { bg: "bg-[#22C55E]/15", text: "text-[#22C55E]" },
    disputed: { bg: "bg-[#EF4444]/15", text: "text-[#EF4444]" },
  };
  const style = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.bg} ${style.text}`}
    >
      {status}
    </span>
  );
}

export default function AdminConsignmentsPage() {
  const supabase = createClient();

  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<StatusTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchConsignments = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("consignments")
      .select(
        `
        *,
        consigner:users!consignments_consigner_id_fkey(username, email)
      `
      )
      .order("created_at", { ascending: false });

    if (activeTab !== "all") {
      query = query.eq("status", activeTab);
    }

    const { data, error } = await query;

    if (!error && data) {
      setConsignments(data as Consignment[]);
    }
    setLoading(false);
  }, [activeTab, supabase]);

  useEffect(() => {
    fetchConsignments();
  }, [fetchConsignments]);

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id);
    const { error } = await supabase
      .from("consignments")
      .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (!error) {
      setConsignments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } as Consignment : c))
      );
    }
    setUpdatingId(null);
  }

  function truncateId(id: string): string {
    return id.length > 8 ? `${id.slice(0, 8)}...` : id;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const filtered = consignments.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.id.toLowerCase().includes(q) ||
      c.consigner?.username?.toLowerCase().includes(q) ||
      c.consigner?.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#E2E8F0]">Consignments</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Manage incoming consignment submissions.
          </p>
        </div>
        <button
          onClick={fetchConsignments}
          className="inline-flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-4 py-2 text-sm font-medium text-[#E2E8F0] transition-colors hover:border-[#FACC15]/40 hover:text-[#FACC15]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search by ID, username, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-[#334155] bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
        />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[#334155] bg-[#1E293B] p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-[#FACC15]/15 text-[#FACC15]"
                : "text-[#94A3B8] hover:text-[#E2E8F0]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#1E293B]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-[#94A3B8]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-[#94A3B8]" />
            <p className="mt-3 text-sm text-[#94A3B8]">
              No consignments found.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#334155] text-left text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                <th className="px-6 py-3 w-8" />
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Consigner</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155]">
              {filtered.map((consignment) => (
                <>
                  <tr
                    key={consignment.id}
                    onClick={() =>
                      setExpandedId(
                        expandedId === consignment.id
                          ? null
                          : consignment.id
                      )
                    }
                    className="cursor-pointer transition-colors hover:bg-[#0F172A]/40"
                  >
                    <td className="px-6 py-3">
                      {expandedId === consignment.id ? (
                        <ChevronUp className="h-4 w-4 text-[#94A3B8]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#94A3B8]" />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 font-mono text-sm text-[#FACC15]">
                      {truncateId(consignment.id)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#E2E8F0]">
                      {consignment.consigner?.username ?? "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {statusBadge(consignment.status)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#94A3B8]">
                      {formatDate(consignment.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <select
                          value={consignment.status}
                          onChange={(e) =>
                            handleStatusChange(
                              consignment.id,
                              e.target.value
                            )
                          }
                          disabled={updatingId === consignment.id}
                          className="rounded-md border border-[#334155] bg-[#0F172A] px-2 py-1 text-xs text-[#E2E8F0] outline-none focus:border-[#FACC15]/50 disabled:opacity-50"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>

                        {(consignment.status === "received" ||
                          consignment.status === "processing") && (
                          <Link
                            href={`/admin/listings/create?consignment_id=${consignment.id}`}
                            className="inline-flex items-center gap-1 rounded-md bg-[#FACC15]/15 px-2.5 py-1 text-xs font-medium text-[#FACC15] transition-colors hover:bg-[#FACC15]/25"
                          >
                            <Plus className="h-3 w-3" />
                            Create Listing
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded details row */}
                  {expandedId === consignment.id && (
                    <tr
                      key={`${consignment.id}-details`}
                      className="bg-[#0F172A]/30"
                    >
                      <td colSpan={6} className="px-6 py-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <p className="text-xs font-medium uppercase text-[#94A3B8]">
                              Full ID
                            </p>
                            <p className="mt-1 break-all font-mono text-sm text-[#E2E8F0]">
                              {consignment.id}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-[#94A3B8]">
                              Consigner Email
                            </p>
                            <p className="mt-1 text-sm text-[#E2E8F0]">
                              {consignment.consigner?.email ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-[#94A3B8]">
                              Description
                            </p>
                            <p className="mt-1 text-sm text-[#E2E8F0]">
                              {(consignment as any).description ?? "No description provided"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-[#94A3B8]">
                              Tracking Number
                            </p>
                            <p className="mt-1 text-sm text-[#E2E8F0]">
                              {(consignment as any).tracking_number ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-[#94A3B8]">
                              Item Count
                            </p>
                            <p className="mt-1 text-sm text-[#E2E8F0]">
                              {(consignment as any).item_count ?? "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-[#94A3B8]">
                              Estimated Value
                            </p>
                            <p className="mt-1 text-sm text-[#E2E8F0]">
                              {(consignment as any).estimated_value
                                ? `$${(consignment as any).estimated_value.toFixed(2)}`
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-[#94A3B8]">
                              Last Updated
                            </p>
                            <p className="mt-1 text-sm text-[#E2E8F0]">
                              {consignment.updated_at
                                ? formatDate(consignment.updated_at)
                                : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium uppercase text-[#94A3B8]">
                              Notes
                            </p>
                            <p className="mt-1 text-sm text-[#E2E8F0]">
                              {(consignment as any).admin_notes ?? "None"}
                            </p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
