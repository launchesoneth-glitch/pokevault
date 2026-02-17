import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Package,
  Truck,
  PackageCheck,
  Settings,
  Tag,
  DollarSign,
  Wallet,
  ChevronLeft,
  Clock,
  ArrowRight,
  Plus,
  Filter,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type ConsignmentStatus =
  | "pending"
  | "shipped_to_us"
  | "received"
  | "processing"
  | "listed"
  | "sold"
  | "paid_out";

interface ConsignmentStatusHistory {
  status: ConsignmentStatus;
  timestamp: string;
  note?: string;
}

interface Consignment {
  id: string;
  category: string;
  card_name: string;
  set_name: string | null;
  condition: string | null;
  grading_company: string | null;
  grade_value: string | null;
  quantity: number;
  estimated_value: number;
  status: ConsignmentStatus;
  status_history: ConsignmentStatusHistory[];
  created_at: string;
  sale_price: number | null;
  payout_amount: number | null;
  listing_url: string | null;
}

const STATUS_STEPS: {
  key: ConsignmentStatus;
  label: string;
  icon: typeof Package;
}[] = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "shipped_to_us", label: "Shipped", icon: Truck },
  { key: "received", label: "Received", icon: PackageCheck },
  { key: "processing", label: "Processing", icon: Settings },
  { key: "listed", label: "Listed", icon: Tag },
  { key: "sold", label: "Sold", icon: DollarSign },
  { key: "paid_out", label: "Paid Out", icon: Wallet },
];

const STATUS_COLORS: Record<ConsignmentStatus, string> = {
  pending: "bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30",
  shipped_to_us: "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30",
  received: "bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/30",
  processing: "bg-[#FACC15]/20 text-[#FACC15] border-[#FACC15]/30",
  listed: "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30",
  sold: "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30",
  paid_out: "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30",
};

function getStatusStepIndex(status: ConsignmentStatus): number {
  return STATUS_STEPS.findIndex((s) => s.key === status);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

function formatShortDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr));
}

function StatusStepper({ consignment }: { consignment: Consignment }) {
  const currentIndex = getStatusStepIndex(consignment.status);
  const history = consignment.status_history || [];

  return (
    <div className="mt-4 px-2 pb-2">
      {/* Desktop stepper */}
      <div className="hidden sm:block">
        <div className="relative flex items-start justify-between">
          {/* Background line */}
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-[#334155]" />
          {/* Active line */}
          <div
            className="absolute left-0 top-5 h-0.5 bg-[#22C55E] transition-all"
            style={{
              width: `${(currentIndex / (STATUS_STEPS.length - 1)) * 100}%`,
            }}
          />

          {STATUS_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = i <= currentIndex;
            const isCurrent = i === currentIndex;
            const historyEntry = history.find((h) => h.status === step.key);

            return (
              <div
                key={step.key}
                className="relative flex flex-col items-center"
                style={{ width: `${100 / STATUS_STEPS.length}%` }}
              >
                <div
                  className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    isCurrent
                      ? "border-[#FACC15] bg-[#FACC15]/20 text-[#FACC15]"
                      : isCompleted
                        ? "border-[#22C55E] bg-[#22C55E] text-white"
                        : "border-[#334155] bg-[#0F172A] text-[#94A3B8]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p
                  className={`mt-2 text-center text-xs font-medium ${
                    isCompleted ? "text-[#E2E8F0]" : "text-[#94A3B8]"
                  }`}
                >
                  {step.label}
                </p>
                {historyEntry && (
                  <p className="mt-0.5 text-center text-[10px] text-[#94A3B8]">
                    {formatShortDate(historyEntry.timestamp)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile stepper (vertical) */}
      <div className="sm:hidden">
        <div className="space-y-0">
          {STATUS_STEPS.map((step, i) => {
            const Icon = step.icon;
            const isCompleted = i <= currentIndex;
            const isCurrent = i === currentIndex;
            const historyEntry = history.find((h) => h.status === step.key);

            return (
              <div key={step.key} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      isCurrent
                        ? "border-[#FACC15] bg-[#FACC15]/20 text-[#FACC15]"
                        : isCompleted
                          ? "border-[#22C55E] bg-[#22C55E] text-white"
                          : "border-[#334155] bg-[#0F172A] text-[#94A3B8]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div
                      className={`h-6 w-0.5 ${
                        i < currentIndex ? "bg-[#22C55E]" : "bg-[#334155]"
                      }`}
                    />
                  )}
                </div>
                <div className="pb-4 pt-1">
                  <p
                    className={`text-sm font-medium ${
                      isCompleted ? "text-[#E2E8F0]" : "text-[#94A3B8]"
                    }`}
                  >
                    {step.label}
                  </p>
                  {historyEntry && (
                    <p className="text-xs text-[#94A3B8]">
                      {formatDate(historyEntry.timestamp)}
                      {historyEntry.note && ` - ${historyEntry.note}`}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default async function MyConsignmentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/consign/my-consignments");
  }

  const { data: consignments, error } = await supabase
    .from("consignments")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items: Consignment[] = (consignments as unknown as Consignment[]) || [];

  const stats = {
    total: items.length,
    active: items.filter(
      (c) => !["sold", "paid_out"].includes(c.status)
    ).length,
    sold: items.filter((c) => c.status === "sold" || c.status === "paid_out")
      .length,
    totalPayout: items
      .filter((c) => c.payout_amount)
      .reduce((sum, c) => sum + (c.payout_amount || 0), 0),
  };

  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/consign"
              className="mb-3 inline-flex items-center gap-1 text-sm text-[#94A3B8] transition-colors hover:text-[#FACC15]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Consignment Info
            </Link>
            <h1 className="text-3xl font-bold">My Consignments</h1>
            <p className="mt-1 text-[#94A3B8]">
              Track the status of all your consigned items.
            </p>
          </div>
          <Link
            href="/consign/submit"
            className="inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90"
          >
            <Plus className="h-4 w-4" />
            New Consignment
          </Link>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
            <p className="text-sm text-[#94A3B8]">Total</p>
            <p className="mt-1 text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
            <p className="text-sm text-[#94A3B8]">Active</p>
            <p className="mt-1 text-2xl font-bold text-[#3B82F6]">
              {stats.active}
            </p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
            <p className="text-sm text-[#94A3B8]">Sold</p>
            <p className="mt-1 text-2xl font-bold text-[#22C55E]">
              {stats.sold}
            </p>
          </div>
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-4">
            <p className="text-sm text-[#94A3B8]">Total Earned</p>
            <p className="mt-1 text-2xl font-bold text-[#FACC15]">
              ${stats.totalPayout.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Consignment List */}
        {items.length === 0 ? (
          <div className="rounded-xl border border-[#334155] bg-[#1E293B] p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-[#94A3B8]" />
            <h2 className="mt-4 text-xl font-semibold">No consignments yet</h2>
            <p className="mt-2 text-[#94A3B8]">
              Submit your first consignment to start selling your cards with
              PokeVault.
            </p>
            <Link
              href="/consign/submit"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-6 py-3 font-semibold text-[#0F172A] transition-colors hover:bg-[#FACC15]/90"
            >
              Submit a Consignment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((consignment) => (
              <details
                key={consignment.id}
                className="group rounded-xl border border-[#334155] bg-[#1E293B] transition-colors hover:border-[#FACC15]/20"
              >
                <summary className="flex cursor-pointer items-center gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
                  {/* Category icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0F172A]">
                    {consignment.category === "graded_card" ? (
                      <Package className="h-5 w-5 text-[#FACC15]" />
                    ) : consignment.category === "sealed_product" ? (
                      <PackageCheck className="h-5 w-5 text-[#FACC15]" />
                    ) : (
                      <Tag className="h-5 w-5 text-[#FACC15]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">
                        {consignment.card_name}
                      </h3>
                      {consignment.set_name && (
                        <span className="shrink-0 text-sm text-[#94A3B8]">
                          {consignment.set_name}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#94A3B8]">
                      <span className="capitalize">
                        {consignment.category.replace(/_/g, " ")}
                      </span>
                      <span>Qty: {consignment.quantity}</span>
                      <span>
                        Est: ${consignment.estimated_value?.toFixed(2)}
                      </span>
                      <span>{formatShortDate(consignment.created_at)}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${
                        STATUS_COLORS[consignment.status]
                      }`}
                    >
                      {consignment.status.replace(/_/g, " ")}
                    </span>

                    {/* Sale price if sold */}
                    {consignment.sale_price && (
                      <span className="text-sm font-semibold text-[#22C55E]">
                        ${consignment.sale_price.toFixed(2)}
                      </span>
                    )}

                    <ChevronLeft className="h-5 w-5 -rotate-90 text-[#94A3B8] transition-transform group-open:rotate-90" />
                  </div>
                </summary>

                {/* Expanded Content */}
                <div className="border-t border-[#334155] px-6 py-5">
                  {/* Stepper */}
                  <StatusStepper consignment={consignment} />

                  {/* Additional Details */}
                  <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-lg bg-[#0F172A] p-3">
                      <p className="text-xs text-[#94A3B8]">Consignment ID</p>
                      <p className="mt-0.5 font-mono text-sm">
                        {consignment.id.slice(0, 8)}
                      </p>
                    </div>

                    {consignment.grading_company && (
                      <div className="rounded-lg bg-[#0F172A] p-3">
                        <p className="text-xs text-[#94A3B8]">Grade</p>
                        <p className="mt-0.5 text-sm font-medium">
                          {consignment.grading_company}{" "}
                          {consignment.grade_value}
                        </p>
                      </div>
                    )}

                    {consignment.condition && (
                      <div className="rounded-lg bg-[#0F172A] p-3">
                        <p className="text-xs text-[#94A3B8]">Condition</p>
                        <p className="mt-0.5 text-sm font-medium">
                          {consignment.condition}
                        </p>
                      </div>
                    )}

                    {consignment.payout_amount && (
                      <div className="rounded-lg bg-[#0F172A] p-3">
                        <p className="text-xs text-[#94A3B8]">Your Payout</p>
                        <p className="mt-0.5 text-sm font-semibold text-[#22C55E]">
                          ${consignment.payout_amount.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Listing link */}
                  {consignment.listing_url && (
                    <div className="mt-4">
                      <Link
                        href={consignment.listing_url}
                        className="inline-flex items-center gap-2 text-sm text-[#FACC15] transition-colors hover:text-[#FACC15]/80"
                      >
                        <Eye className="h-4 w-4" />
                        View Auction Listing
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
