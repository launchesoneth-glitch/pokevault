import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Zap, Clock, Flame, ArrowRight, Shield, Truck, Trophy, Sparkles } from "lucide-react";
import { ListingCard } from "@/components/listings/listing-card";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: featured } = await supabase
    .from("listings")
    .select("*, listing_images(*), categories(display_name)")
    .eq("status", "active")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(4);

  const { data: endingSoon } = await supabase
    .from("listings")
    .select("*, listing_images(*), categories(display_name)")
    .eq("status", "active")
    .in("listing_type", ["auction", "auction_with_buy_now"])
    .gte("auction_end", new Date().toISOString())
    .order("auction_end", { ascending: true })
    .limit(4);

  const { data: newest } = await supabase
    .from("listings")
    .select("*, listing_images(*), categories(display_name)")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 py-24 sm:py-32">
        {/* Background effects */}
        <div className="bg-particles absolute inset-0" />
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-neon-blue/10 blur-[100px]" />
        <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-neon-purple/10 blur-[100px]" />
        <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[80px]" />

        <div className="relative mx-auto max-w-7xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent backdrop-blur-sm">
            <Zap className="h-4 w-4" />
            {"Europe's #1 Pokemon TCG Consignment House"}
          </div>

          <h1 className="mt-8 text-5xl font-extrabold tracking-tight sm:text-7xl">
            <span className="text-foreground">Sell your cards.</span>
            <br />
            <span className="text-gradient">We handle everything.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            Ship your Pokemon cards to us. We photograph, list, sell, and ship
            them. You get paid. Simple consignment auctions for the EU market.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/consign"
              className="btn-neon inline-flex items-center gap-2 px-8 py-3.5 text-base"
            >
              Start Consigning
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/browse"
              className="btn-outline-neon inline-flex items-center gap-2 px-8 py-3.5 text-base font-medium"
            >
              Browse Listings
            </Link>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8">
            <div>
              <p className="text-3xl font-extrabold text-neon-gold">10K+</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">Cards Sold</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-neon-blue">2.5K</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">Collectors</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-neon-purple">99%</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-muted">Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative border-t border-border/50 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-foreground">
              How It <span className="text-neon-gold">Works</span>
            </h2>
            <p className="mt-3 text-muted">Three simple steps to start selling</p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <HowItWorksCard
              step={1}
              icon={Truck}
              title="Ship Your Cards"
              description="Pack your cards safely and ship them to our facility. We accept raw singles, graded cards, and sealed product."
              color="neon-blue"
            />
            <HowItWorksCard
              step={2}
              icon={Shield}
              title="We List & Sell"
              description="We professionally photograph your cards, create listings, and run auctions to get you the best price."
              color="neon-purple"
            />
            <HowItWorksCard
              step={3}
              icon={Trophy}
              title="Get Paid"
              description="Once sold, we handle shipping to the buyer and transfer your earnings directly to your bank account."
              color="accent"
            />
          </div>
        </div>
      </section>

      {/* Featured */}
      {featured && featured.length > 0 && (
        <ListingSection
          icon={<Flame className="h-5 w-5 text-pokered" />}
          title="Featured"
          linkHref="/browse"
          linkLabel="View All"
          listings={featured}
        />
      )}

      {/* Ending Soon */}
      {endingSoon && endingSoon.length > 0 && (
        <ListingSection
          icon={<Clock className="h-5 w-5 text-warning" />}
          title="Ending Soon"
          linkHref="/browse/auctions"
          linkLabel="All Auctions"
          listings={endingSoon}
        />
      )}

      {/* Newest or empty state */}
      {newest && newest.length > 0 ? (
        <ListingSection
          icon={<Sparkles className="h-5 w-5 text-neon-blue" />}
          title="New Listings"
          linkHref="/browse"
          linkLabel="View All"
          listings={newest}
        />
      ) : (
        <section className="relative px-4 py-24">
          <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[80px]" />
          <div className="relative mx-auto max-w-md text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 animate-pulse-glow">
              <Zap className="h-8 w-8 text-accent" />
            </div>
            <h2 className="mt-6 text-2xl font-extrabold text-foreground">No listings yet</h2>
            <p className="mt-3 text-muted">Be the first to consign your Pokemon cards!</p>
            <Link
              href="/consign/submit"
              className="btn-neon mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm"
            >
              Submit a Consignment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function ListingSection({
  icon,
  title,
  linkHref,
  linkLabel,
  listings,
}: {
  icon: React.ReactNode;
  title: string;
  linkHref: string;
  linkLabel: string;
  listings: Array<Record<string, unknown>>;
}) {
  return (
    <section className="border-t border-border/50 px-4 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {icon}
            <h2 className="text-xl font-extrabold text-foreground">{title}</h2>
          </div>
          <Link
            href={linkHref}
            className="group flex items-center gap-1.5 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
          >
            {linkLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {listings.map((listing) => (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <ListingCard key={(listing as any).id} listing={listing as any} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksCard({
  step,
  icon: Icon,
  title,
  description,
  color,
}: {
  step: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    "neon-blue": "text-neon-blue border-neon-blue/20 bg-neon-blue/5",
    "neon-purple": "text-neon-purple border-neon-purple/20 bg-neon-purple/5",
    accent: "text-accent border-accent/20 bg-accent/5",
  };
  const classes = colorMap[color] || colorMap.accent;
  const textColor = color === "neon-blue" ? "text-neon-blue" : color === "neon-purple" ? "text-neon-purple" : "text-accent";

  return (
    <div className="group relative rounded-2xl border border-border bg-surface p-8 text-center transition-all duration-300 hover:border-border-light hover:-translate-y-1">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${classes}`}>
          {step}
        </span>
      </div>
      <div className={`mx-auto mt-2 flex h-14 w-14 items-center justify-center rounded-xl ${classes} border transition-all duration-300 group-hover:scale-110`}>
        <Icon className={`h-7 w-7 ${textColor}`} />
      </div>
      <h3 className="mt-5 text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
    </div>
  );
}
