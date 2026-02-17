"use client";

import { useEffect, useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Globe,
  Languages,
  CreditCard,
  AlertTriangle,
  Loader2,
  Check,
  Upload,
  Trash2,
  ExternalLink,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Country list (ISO 3166-1 subset -- extend as needed)                      */
/* -------------------------------------------------------------------------- */

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Japan",
  "Germany",
  "France",
  "Brazil",
  "Mexico",
  "South Korea",
  "Netherlands",
  "Spain",
  "Italy",
  "Sweden",
  "Norway",
  "Finland",
  "Denmark",
  "New Zealand",
  "Singapore",
  "Philippines",
  "India",
  "Other",
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
] as const;

/* -------------------------------------------------------------------------- */
/*  Page component                                                            */
/* -------------------------------------------------------------------------- */

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  /* ---- State ------------------------------------------------------------ */

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [country, setCountry] = useState("");
  const [language, setLanguage] = useState("en");
  const [stripeConnected, setStripeConnected] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /* ---- Load profile ----------------------------------------------------- */

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("display_name, bio, avatar_url, country_code, preferred_language, stripe_connect_account_id")
        .eq("id", user.id)
        .single();

      if (profile) {
        setDisplayName(profile.display_name ?? "");
        setBio(profile.bio ?? "");
        setAvatarUrl(profile.avatar_url ?? "");
        setCountry(profile.country_code ?? "");
        setLanguage(profile.preferred_language ?? "en");
        setStripeConnected(!!profile.stripe_connect_account_id);
      }

      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  /* ---- Save profile ----------------------------------------------------- */

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        country: country || null,
        language,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    }

    setSaving(false);
  }

  /* ---- Avatar upload ---------------------------------------------------- */

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2 MB.");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const ext = file.name.split(".").pop();
    const path = `avatars/${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    setAvatarUrl(publicUrl);
  }

  /* ---- Render ----------------------------------------------------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage your PokeVault account and preferences.
        </p>
      </div>

      {/* ================================================================== */}
      {/*  Profile form                                                      */}
      {/* ================================================================== */}
      <form onSubmit={handleSave} className="space-y-8">
        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <User className="h-4 w-4 text-accent" />
              Profile
            </h2>
          </div>

          <div className="space-y-6 p-5">
            {/* Avatar */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Avatar
              </label>
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-accent bg-accent/10">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl font-bold text-accent">
                      {displayName[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-surface">
                    <Upload className="h-3.5 w-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarUpload}
                    />
                  </label>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl("")}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-muted transition-colors hover:text-pokered"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Display name */}
            <div>
              <label htmlFor="display_name" className="mb-1.5 block text-sm font-medium text-foreground">
                Display Name
              </label>
              <input
                id="display_name"
                type="text"
                maxLength={50}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Your display name"
              />
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-foreground">
                Bio
              </label>
              <textarea
                id="bio"
                rows={4}
                maxLength={300}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Tell other trainers about yourself..."
              />
              <p className="mt-1 text-xs text-muted">{bio.length}/300</p>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/*  Locale                                                          */}
        {/* ================================================================ */}
        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Globe className="h-4 w-4 text-accent" />
              Locale
            </h2>
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2">
            {/* Country */}
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-foreground">
                Country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Language */}
            <div>
              <label htmlFor="language" className="mb-1.5 block text-sm font-medium text-foreground">
                <Languages className="mr-1 inline h-3.5 w-3.5" />
                Language
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ================================================================ */}
        {/*  Save / status                                                   */}
        {/* ================================================================ */}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>

          {error && (
            <p className="text-sm text-pokered">{error}</p>
          )}
        </div>
      </form>

      {/* ================================================================== */}
      {/*  Stripe Connect                                                    */}
      {/* ================================================================== */}
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <CreditCard className="h-4 w-4 text-accent" />
            Payouts &amp; Stripe Connect
          </h2>
        </div>

        <div className="p-5">
          {stripeConnected ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Stripe account connected
                </p>
                <p className="text-xs text-muted">
                  You can receive payouts for your sales.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Connect your Stripe account to receive payouts
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  You need a Stripe account to sell cards on PokeVault.
                </p>
              </div>
              <a
                href="/api/payments/setup-connect"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent/90"
              >
                Set Up Stripe
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ================================================================== */}
      {/*  Danger zone                                                       */}
      {/* ================================================================== */}
      <section className="rounded-xl border border-pokered/30 bg-surface">
        <div className="border-b border-pokered/30 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-pokered">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </h2>
        </div>

        <div className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Delete account</p>
              <p className="mt-0.5 text-xs text-muted">
                Permanently delete your PokeVault account and all associated data. This
                action cannot be undone.
              </p>
            </div>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="shrink-0 rounded-lg border border-pokered/30 px-4 py-2 text-sm font-medium text-pokered transition-colors hover:bg-pokered/10"
              >
                Delete Account
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Placeholder -- wire up to a server action or API route
                    alert(
                      "Account deletion is not yet implemented. Please contact support.",
                    );
                    setShowDeleteConfirm(false);
                  }}
                  className="rounded-lg bg-pokered px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-pokered/90"
                >
                  Confirm Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
