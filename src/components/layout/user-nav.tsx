"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  User,
  LayoutDashboard,
  Eye,
  Bell,
  Settings,
  LogOut,
  Trophy,
  BookOpen,
  Tag,
  ChevronDown,
} from "lucide-react";
import { XpBar } from "@/components/ui/xp-bar";

interface UserNavProps {
  user: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    xp: number;
    tier: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  const displayName = user.display_name || user.username;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-surface"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-background">
          {displayName[0].toUpperCase()}
        </div>
        <div className="hidden flex-col items-start md:flex">
          <span className="text-sm font-medium text-foreground">
            {displayName}
          </span>
          <XpBar xp={user.xp} tier={user.tier} compact />
        </div>
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-surface shadow-xl">
          <div className="border-b border-border p-3">
            <p className="text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted">@{user.username}</p>
            <XpBar xp={user.xp} tier={user.tier} className="mt-2" />
          </div>
          <div className="p-1">
            <NavItem
              href={`/profile/${user.username}`}
              icon={User}
              label="Profile"
              onClick={() => setOpen(false)}
            />
            <NavItem
              href="/dashboard"
              icon={LayoutDashboard}
              label="Dashboard"
              onClick={() => setOpen(false)}
            />
            <NavItem
              href="/dashboard/favorites"
              icon={Eye}
              label="Watchlist"
              onClick={() => setOpen(false)}
            />
            <NavItem
              href="/dashboard/notifications"
              icon={Bell}
              label="Notifications"
              onClick={() => setOpen(false)}
            />
            <NavItem
              href="/gamification"
              icon={Trophy}
              label="Rewards"
              onClick={() => setOpen(false)}
            />
            <NavItem
              href="/collection"
              icon={BookOpen}
              label="Collection"
              onClick={() => setOpen(false)}
            />
            <NavItem
              href="/sell/my-listings"
              icon={Tag}
              label="My Listings"
              onClick={() => setOpen(false)}
            />
            <NavItem
              href="/dashboard/settings"
              icon={Settings}
              label="Settings"
              onClick={() => setOpen(false)}
            />
          </div>
          <div className="border-t border-border p-1">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-pokered transition-colors hover:bg-surface-hover"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-surface-hover"
    >
      <Icon className="h-4 w-4 text-muted" />
      {label}
    </Link>
  );
}
