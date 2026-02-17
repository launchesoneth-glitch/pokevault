"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  ExternalLink,
  Loader2,
  BadgeCheck,
  Crown,
} from "lucide-react";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["users"]["Row"];

function tierBadge(tier: string) {
  const map: Record<string, { bg: string; text: string; icon?: React.ElementType }> = {
    bronze: { bg: "bg-[#CD7F32]/15", text: "text-[#CD7F32]" },
    silver: { bg: "bg-[#94A3B8]/15", text: "text-[#94A3B8]" },
    gold: { bg: "bg-[#FACC15]/15", text: "text-[#FACC15]" },
    platinum: { bg: "bg-[#3B82F6]/15", text: "text-[#3B82F6]" },
    diamond: { bg: "bg-[#A855F7]/15", text: "text-[#A855F7]", icon: Crown },
  };
  const style = map[tier?.toLowerCase()] ?? map.bronze;
  const Icon = style.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${style.bg} ${style.text}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {tier ?? "Bronze"}
    </span>
  );
}

export default function AdminUsersPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);
  const [togglingVerified, setTogglingVerified] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data as Profile[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleToggleAdmin(userId: string, currentValue: boolean) {
    const action = currentValue ? "remove admin from" : "grant admin to";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;

    setTogglingAdmin(userId);
    const { error } = await supabase
      .from("users")
      .update({
        is_admin: !currentValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_admin: !currentValue } : u
        )
      );
    }
    setTogglingAdmin(null);
  }

  async function handleToggleVerified(userId: string, currentValue: boolean) {
    setTogglingVerified(userId);
    const { error } = await supabase
      .from("users")
      .update({
        is_verified: !currentValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_verified: !currentValue } : u
        )
      );
    }
    setTogglingVerified(null);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatCurrency(value: number | null | undefined): string {
    if (value == null) return "$0.00";
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  const filtered = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (u as any).username?.toLowerCase().includes(q) ||
      (u as any).email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#E2E8F0]">Users</h2>
          <p className="mt-1 text-sm text-[#94A3B8]">
            Manage user accounts, roles, and verification.
          </p>
        </div>
        <button
          onClick={fetchUsers}
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
          placeholder="Search by username or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-[#334155] bg-[#1E293B] py-2.5 pl-10 pr-4 text-sm text-[#E2E8F0] placeholder-[#94A3B8] outline-none transition-colors focus:border-[#FACC15]/50 focus:ring-1 focus:ring-[#FACC15]/25"
        />
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-[#334155] bg-[#1E293B] p-4">
          <p className="text-xs font-medium text-[#94A3B8]">Total Users</p>
          <p className="mt-1 text-xl font-bold text-[#E2E8F0]">
            {users.length}
          </p>
        </div>
        <div className="rounded-lg border border-[#334155] bg-[#1E293B] p-4">
          <p className="text-xs font-medium text-[#94A3B8]">Admins</p>
          <p className="mt-1 text-xl font-bold text-[#FACC15]">
            {users.filter((u) => (u as any).is_admin).length}
          </p>
        </div>
        <div className="rounded-lg border border-[#334155] bg-[#1E293B] p-4">
          <p className="text-xs font-medium text-[#94A3B8]">Verified</p>
          <p className="mt-1 text-xl font-bold text-[#22C55E]">
            {users.filter((u) => (u as any).is_verified).length}
          </p>
        </div>
        <div className="rounded-lg border border-[#334155] bg-[#1E293B] p-4">
          <p className="text-xs font-medium text-[#94A3B8]">New This Month</p>
          <p className="mt-1 text-xl font-bold text-[#3B82F6]">
            {
              users.filter((u) => {
                const created = new Date(u.created_at);
                const now = new Date();
                return (
                  created.getMonth() === now.getMonth() &&
                  created.getFullYear() === now.getFullYear()
                );
              }).length
            }
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#334155] bg-[#1E293B]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-[#94A3B8]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-[#94A3B8]" />
            <p className="mt-3 text-sm text-[#94A3B8]">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#334155] text-left text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
                  <th className="px-6 py-3">Username</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Country</th>
                  <th className="px-6 py-3">Tier</th>
                  <th className="px-6 py-3">XP</th>
                  <th className="px-6 py-3">Sales Vol.</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-[#0F172A]/40"
                  >
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#E2E8F0]">
                          {(user as any).username ?? "Unnamed"}
                        </span>
                        {(user as any).is_admin && (
                          <Shield className="h-3.5 w-3.5 text-[#FACC15]" />
                        )}
                        {(user as any).is_verified && (
                          <BadgeCheck className="h-3.5 w-3.5 text-[#3B82F6]" />
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#94A3B8]">
                      {(user as any).email ?? "N/A"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#E2E8F0]">
                      {(user as any).country ?? "--"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      {tierBadge((user as any).tier ?? "bronze")}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#E2E8F0]">
                      {((user as any).xp ?? 0).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-[#E2E8F0]">
                      {formatCurrency((user as any).sales_volume)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[#94A3B8]">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="flex items-center gap-2">
                        {/* Toggle admin */}
                        <button
                          onClick={() =>
                            handleToggleAdmin(
                              user.id,
                              (user as any).is_admin ?? false
                            )
                          }
                          disabled={togglingAdmin === user.id}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            (user as any).is_admin
                              ? "bg-[#FACC15]/15 text-[#FACC15] hover:bg-[#FACC15]/25"
                              : "bg-[#334155]/50 text-[#94A3B8] hover:bg-[#334155]"
                          }`}
                          title={
                            (user as any).is_admin
                              ? "Remove admin"
                              : "Make admin"
                          }
                        >
                          {togglingAdmin === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShieldCheck className="h-3 w-3" />
                          )}
                          Admin
                        </button>

                        {/* Toggle verified */}
                        <button
                          onClick={() =>
                            handleToggleVerified(
                              user.id,
                              (user as any).is_verified ?? false
                            )
                          }
                          disabled={togglingVerified === user.id}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            (user as any).is_verified
                              ? "bg-[#3B82F6]/15 text-[#3B82F6] hover:bg-[#3B82F6]/25"
                              : "bg-[#334155]/50 text-[#94A3B8] hover:bg-[#334155]"
                          }`}
                          title={
                            (user as any).is_verified
                              ? "Remove verified"
                              : "Verify user"
                          }
                        >
                          {togglingVerified === user.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <BadgeCheck className="h-3 w-3" />
                          )}
                          Verified
                        </button>

                        {/* View profile */}
                        <Link
                          href={`/profile/${(user as any).username ?? user.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-[#334155] px-2.5 py-1 text-xs font-medium text-[#E2E8F0] transition-colors hover:border-[#FACC15]/40 hover:text-[#FACC15]"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
