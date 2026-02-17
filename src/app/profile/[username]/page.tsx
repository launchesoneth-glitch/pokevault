import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Tables } from "@/types/database";
import { TIERS } from "@/lib/constants";
import { XpBar } from "@/components/ui/xp-bar";
import {
  MapPin,
  Calendar,
  ShoppingBag,
  Tag,
  Users,
  UserPlus,
  UserMinus,
  Award,
  Star,
} from "lucide-react";
import { FollowButton } from "./follow-button";

/* -------------------------------------------------------------------------- */
/*  Metadata                                                                  */
/* -------------------------------------------------------------------------- */

interface PageProps {
  params: { username: string };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("display_name, username, bio")
    .eq("username", params.username)
    .single();

  if (!user) return { title: "User not found | PokeVault" };

  return {
    title: `${user.display_name ?? user.username} | PokeVault`,
    description:
      user.bio ?? `Check out ${user.display_name ?? user.username}'s profile on PokeVault.`,
  };
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function getTier(xp: number) {
  // Walk the TIERS array (assumed sorted ascending by min_xp) and return the
  // highest tier whose threshold the user has reached.
  let current: (typeof TIERS)[number] = TIERS[0];
  for (const tier of TIERS) {
    if (xp >= tier.min_xp) current = tier;
  }
  return current;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default async function PublicProfilePage({ params }: PageProps) {
  const supabase = await createClient();

  /* ---- Fetch profile ---------------------------------------------------- */

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("username", params.username)
    .single();

  if (profileError || !profile) notFound();

  const user = profile as Tables<"users">;
  const tier = getTier(user.xp ?? 0);

  /* ---- Fetch authenticated viewer (for follow button) ------------------- */

  const {
    data: { user: viewer },
  } = await supabase.auth.getUser();

  const isOwnProfile = viewer?.id === user.id;

  let isFollowing = false;
  if (viewer && !isOwnProfile) {
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", viewer.id)
      .eq("following_id", user.id);
    isFollowing = (count ?? 0) > 0;
  }

  /* ---- Follower / following counts -------------------------------------- */

  const { count: followerCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", user.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", user.id);

  /* ---- Badges ----------------------------------------------------------- */

  const { data: userBadges } = await supabase
    .from("user_badges")
    .select("earned_at, badges(*)")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  /* ---- Active listings -------------------------------------------------- */

  const { data: listings } = await supabase
    .from("listings")
    .select("*, listing_images(image_url, sort_order)")
    .eq("seller_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(12);

  /* ---- Stats ------------------------------------------------------------ */

  const { count: totalSales } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("seller_id", user.id)
    .eq("status", "completed");

  const { count: totalPurchases } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("buyer_id", user.id)
    .eq("status", "completed");

  /* ---- Render ----------------------------------------------------------- */

  const initials = (user.display_name ?? user.username)?.[0]?.toUpperCase() ?? "?";

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* ------------------------------------------------------------------ */}
      {/*  Hero / Profile header                                             */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-4 border-accent">
              {user.avatar_url ? (
                <Image
                  src={user.avatar_url}
                  alt={user.display_name ?? user.username}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-accent/20 text-4xl font-bold text-accent">
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col items-center gap-3 sm:items-start">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {user.display_name ?? user.username}
                </h1>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: tier.color + "22", color: tier.color }}
                >
                  {tier.name}
                </span>
              </div>

              <p className="text-sm text-muted">@{user.username}</p>

              {user.bio && (
                <p className="max-w-xl text-sm leading-relaxed text-foreground/80">
                  {user.bio}
                </p>
              )}

              {/* Meta row */}
              <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-muted">
                {user.country_code && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {user.country_code}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Member since {formatDate(user.created_at)}
                </span>
              </div>

              {/* XP bar */}
              <div className="mt-2 w-full max-w-sm">
                <XpBar xp={user.xp ?? 0} tier={tier.name} />
              </div>

              {/* Follower / following counts */}
              <div className="mt-2 flex gap-5 text-sm">
                <span>
                  <strong className="text-foreground">{followerCount ?? 0}</strong>{" "}
                  <span className="text-muted">Followers</span>
                </span>
                <span>
                  <strong className="text-foreground">{followingCount ?? 0}</strong>{" "}
                  <span className="text-muted">Following</span>
                </span>
              </div>
            </div>

            {/* Follow / stats actions */}
            <div className="flex shrink-0 flex-col items-center gap-3">
              {viewer && !isOwnProfile && (
                <FollowButton
                  targetUserId={user.id}
                  initialIsFollowing={isFollowing}
                />
              )}

              {isOwnProfile && (
                <Link
                  href="/dashboard/settings"
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                >
                  Edit Profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/*  Stats bar                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-b border-border bg-surface/50">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8 px-4 py-5 text-center sm:justify-start sm:px-6 lg:px-8">
          <StatItem icon={<Tag className="h-4 w-4" />} label="Sales" value={totalSales ?? 0} />
          <StatItem
            icon={<ShoppingBag className="h-4 w-4" />}
            label="Purchases"
            value={totalPurchases ?? 0}
          />
          <StatItem icon={<Star className="h-4 w-4" />} label="XP" value={user.xp ?? 0} />
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* ---------------------------------------------------------------- */}
        {/*  Badge shelf                                                     */}
        {/* ---------------------------------------------------------------- */}
        {userBadges && userBadges.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Award className="h-5 w-5 text-accent" />
              Badges
            </h2>
            <div className="flex flex-wrap gap-3">
              {userBadges.map((ub) => {
                const badge = ub.badges as Tables<"badges">;
                return (
                  <div
                    key={badge.id}
                    className="group relative flex flex-col items-center gap-1.5 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/40"
                  >
                    {badge.icon_url ? (
                      <Image
                        src={badge.icon_url}
                        alt={badge.name}
                        width={48}
                        height={48}
                        className="h-12 w-12 object-contain"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-xl">
                        <Award className="h-6 w-6 text-accent" />
                      </div>
                    )}
                    <span className="text-xs font-medium">{badge.name}</span>

                    {/* Tooltip */}
                    <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-background px-2.5 py-1 text-xs text-muted opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {badge.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/*  Active listings                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Tag className="h-5 w-5 text-accent" />
            Active Listings
          </h2>

          {listings && listings.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {listings.map((listing) => {
                const images = (listing.listing_images ?? []).sort(
                  (a: { sort_order: number }, b: { sort_order: number }) =>
                    a.sort_order - b.sort_order,
                );
                const thumb = images[0]?.image_url;

                return (
                  <Link
                    key={listing.id}
                    href={`/listings/${listing.id}`}
                    className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent/40"
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-background">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt={listing.title}
                          fill
                          className="object-cover transition-transform group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted">
                          No image
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="truncate text-sm font-medium group-hover:text-accent">
                        {listing.title}
                      </h3>
                      {listing.current_bid != null && (
                        <p className="mt-1 text-sm font-semibold text-accent">
                          ${(listing.current_bid / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface/50 py-16 text-center">
              <Tag className="mx-auto mb-3 h-10 w-10 text-muted/50" />
              <p className="text-sm text-muted">No active listings yet.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-accent">{icon}</span>
      <span className="font-semibold text-foreground">{value.toLocaleString()}</span>
      <span className="text-muted">{label}</span>
    </div>
  );
}
