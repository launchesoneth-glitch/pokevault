"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Tag,
  ShoppingBag,
  Heart,
  Bell,
  Settings,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Nav items                                                                 */
/* -------------------------------------------------------------------------- */

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/sales", label: "Sales", icon: Tag },
  { href: "/dashboard/purchases", label: "Purchases", icon: ShoppingBag },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */

interface DashboardSidebarProps {
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function DashboardSidebar({
  displayName,
  username,
  avatarUrl,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = displayName[0]?.toUpperCase() ?? "?";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  /* ---- Shared nav content ----------------------------------------------- */

  const navContent = (
    <>
      {/* User info */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-6">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-accent">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-accent/20 text-sm font-bold text-accent">
              {initials}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted">@{username}</p>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  active ? "text-accent" : "text-muted group-hover:text-foreground"
                }`}
              />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-4 w-4 text-accent" />}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/*  Desktop sidebar                                                   */}
      {/* ------------------------------------------------------------------ */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:flex lg:flex-col">
        {navContent}
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/*  Mobile bottom bar toggle + drawer                                 */}
      {/* ------------------------------------------------------------------ */}

      {/* Floating toggle button (mobile) */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-background shadow-lg transition-transform hover:scale-105 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-border bg-surface transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-5 rounded-md p-1 text-muted hover:text-foreground"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>

        {navContent}
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/*  Mobile bottom navigation bar (compact)                            */}
      {/* ------------------------------------------------------------------ */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-surface py-2 lg:hidden">
        {NAV_ITEMS.slice(0, 5).map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-2 text-[10px] font-medium ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
