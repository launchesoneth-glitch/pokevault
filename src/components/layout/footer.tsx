import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative border-t border-border/50 bg-background">
      {/* Top gradient line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neon-blue/40 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-neon-blue">
                <Sparkles className="h-3.5 w-3.5 text-background" />
              </div>
              <span className="text-lg font-extrabold tracking-tight">
                <span className="text-neon-gold">Poké</span><span className="text-foreground">Vault</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Europe&apos;s premier Pokemon TCG consignment auction house. Buy, sell, and collect with confidence.
            </p>
            <div className="mt-4 flex gap-1">
              {["#ffd700", "#00d4ff", "#bf5af2", "#ff2d87", "#39ff14"].map((color) => (
                <div
                  key={color}
                  className="h-1 w-6 rounded-full"
                  style={{ background: color, opacity: 0.6 }}
                />
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neon-blue">
              Marketplace
            </h3>
            <ul className="space-y-2.5">
              <FooterLink href="/browse">Browse All</FooterLink>
              <FooterLink href="/browse/auctions">Auctions</FooterLink>
              <FooterLink href="/browse/buy-now">Buy Now</FooterLink>
              <FooterLink href="/browse/sets">Browse by Set</FooterLink>
            </ul>
          </div>

          {/* Sell */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neon-purple">
              Sell With Us
            </h3>
            <ul className="space-y-2.5">
              <FooterLink href="/consign">How It Works</FooterLink>
              <FooterLink href="/consign/submit">Submit Cards</FooterLink>
              <FooterLink href="/consign/my-consignments">My Consignments</FooterLink>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-accent">
              Community
            </h3>
            <ul className="space-y-2.5">
              <FooterLink href="/gamification/leaderboard">Leaderboard</FooterLink>
              <FooterLink href="/gamification/badges">Badges</FooterLink>
              <FooterLink href="/gamification/challenges">Challenges</FooterLink>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 border-t border-border/50 pt-8">
          <p className="text-xs text-muted/60">
            &copy; {new Date().getFullYear()} PokeVault. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-muted transition-all hover:text-foreground hover:translate-x-0.5 inline-block">
        {children}
      </Link>
    </li>
  );
}
