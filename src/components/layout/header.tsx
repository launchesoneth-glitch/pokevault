import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "./user-nav";
import { Sparkles } from "lucide-react";
import { SearchButton } from "./search-button";

export async function Header() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let profile = null;
  if (authUser) {
    const { data } = await supabase
      .from("users")
      .select("username, display_name, avatar_url, xp, tier")
      .eq("id", authUser.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-50 glass-strong">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-neon-blue shadow-lg shadow-accent/20 transition-shadow group-hover:shadow-accent/40">
            <Sparkles className="h-4 w-4 text-background" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-neon-gold">Poké</span><span className="text-foreground">Vault</span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { href: "/browse", label: "Browse" },
            { href: "/sell", label: "Sell" },
            { href: "/consign", label: "Consign" },
            { href: "/gamification", label: "Rewards" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-all hover:bg-white/5 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <SearchButton />

          {authUser && profile ? (
            <UserNav user={profile} />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted transition-all hover:text-foreground"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="btn-neon px-5 py-2 text-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
