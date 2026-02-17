import Link from "next/link";
import {
  Package,
  Camera,
  Truck,
  Search,
  DollarSign,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Star,
  Percent,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  {
    icon: Package,
    title: "Select & Describe",
    description:
      "Choose your card category and provide details including set, condition, and estimated value.",
  },
  {
    icon: Camera,
    title: "Upload Photos",
    description:
      "Take clear photos of the front, back, and any notable features or defects of your cards.",
  },
  {
    icon: Truck,
    title: "Ship to Us",
    description:
      "Use our prepaid shipping label to send your cards securely. We provide tracking every step of the way.",
  },
  {
    icon: Search,
    title: "Authentication & Grading",
    description:
      "Our experts verify authenticity, assess condition, and prepare professional listing photos.",
  },
  {
    icon: DollarSign,
    title: "Auction & Payout",
    description:
      "Your cards go live in our marketplace. Once sold, you receive payout within 5 business days.",
  },
];

const COMMISSION_RATES = [
  {
    category: "Raw Singles",
    rate: "15%",
    rateValue: 15,
    description: "Ungraded individual cards",
    icon: "🃏",
  },
  {
    category: "Graded Cards",
    rate: "12%",
    rateValue: 12,
    description: "PSA, BGS, CGC graded slabs",
    icon: "🏆",
  },
  {
    category: "Sealed Product",
    rate: "10%",
    rateValue: 10,
    description: "Booster boxes, ETBs, tins, etc.",
    icon: "📦",
  },
];

const TIER_DISCOUNTS = [
  { tier: "Bronze", discount: "0%", color: "text-orange-400" },
  { tier: "Silver", discount: "1%", color: "text-[#94A3B8]" },
  { tier: "Gold", discount: "2%", color: "text-[#FACC15]" },
  { tier: "Platinum", discount: "3%", color: "text-cyan-300" },
  { tier: "Diamond", discount: "5%", color: "text-purple-400" },
];

const FAQ_ITEMS = [
  {
    question: "What condition do my cards need to be in?",
    answer:
      "We accept cards in any condition, from heavily played to mint. Our experts will accurately grade each card to ensure fair pricing and buyer satisfaction. Cards in better condition naturally fetch higher prices at auction.",
  },
  {
    question: "How long does the consignment process take?",
    answer:
      "From the time we receive your cards, expect 3-5 business days for authentication and listing preparation. Auctions typically run for 7 days. Payout is processed within 5 business days after the auction closes. Total timeline is roughly 2-3 weeks.",
  },
  {
    question: "Is there a minimum value for consignment?",
    answer:
      "For raw singles, we recommend a minimum estimated value of $10 per card. For graded cards, the minimum is $25. Sealed product has no minimum value. We may bundle lower-value cards into lots for more efficient selling.",
  },
  {
    question: "What if my card doesn't sell?",
    answer:
      "If your card doesn't sell in the first auction, we'll relist it once at a slightly reduced reserve. If it still doesn't sell, you can choose to have it returned (shipping at your cost) or authorize us to list it at no reserve.",
  },
  {
    question: "How are payouts handled?",
    answer:
      "Payouts are sent via your preferred method: direct bank transfer, PayPal, or store credit (with a 5% bonus). All payouts are processed within 5 business days of the auction closing and buyer payment confirmation.",
  },
  {
    question: "Do you provide insurance during shipping?",
    answer:
      "Yes! All shipments to our facility are fully insured up to the declared value. We provide prepaid shipping labels with tracking and insurance included. For high-value consignments over $500, we arrange signature-required delivery.",
  },
];

export default function ConsignPage() {
  return (
    <main className="min-h-screen bg-[#0F172A] text-[#E2E8F0]">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FACC15]/5 via-transparent to-[#EF4444]/5" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#FACC15]/30 bg-[#FACC15]/10 px-4 py-1.5 text-sm font-medium text-[#FACC15]">
              <Star className="h-4 w-4" />
              Trusted by 10,000+ collectors
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn Your Collection Into{" "}
              <span className="bg-gradient-to-r from-[#FACC15] to-[#F59E0B] bg-clip-text text-transparent">
                Cash
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-[#94A3B8]">
              PokeVault handles everything -- authentication, photography,
              listing, and selling. You ship your cards, we do the rest. Earn
              top dollar with the lowest commission rates in the hobby.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/consign/submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-8 py-3.5 text-base font-semibold text-[#0F172A] shadow-lg shadow-[#FACC15]/20 transition-all hover:bg-[#FACC15]/90 hover:shadow-xl hover:shadow-[#FACC15]/30"
              >
                Start Consigning
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/consign/my-consignments"
                className="inline-flex items-center gap-2 rounded-lg border border-[#334155] bg-[#1E293B] px-8 py-3.5 text-base font-semibold text-[#E2E8F0] transition-all hover:border-[#FACC15]/50 hover:bg-[#1E293B]/80"
              >
                Track My Consignments
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-[#334155] bg-[#1E293B]/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <p className="mt-3 text-[#94A3B8]">
              Five simple steps from your collection to your wallet
            </p>
          </div>

          <div className="relative mt-16">
            {/* Connecting line */}
            <div className="absolute left-0 right-0 top-12 hidden h-0.5 bg-gradient-to-r from-[#FACC15]/0 via-[#FACC15]/40 to-[#FACC15]/0 lg:block" />

            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="relative text-center">
                    <div className="relative mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-[#334155] bg-[#0F172A] shadow-lg">
                      <Icon className="h-10 w-10 text-[#FACC15]" />
                      <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#FACC15] text-sm font-bold text-[#0F172A]">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-[#94A3B8]">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Commission Rates */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-[#FACC15]">
              <Percent className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                Industry-Low Rates
              </span>
            </div>
            <h2 className="text-3xl font-bold">Commission Rates</h2>
            <p className="mt-3 text-[#94A3B8]">
              Transparent pricing with no hidden fees. You keep more of what you
              earn.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {COMMISSION_RATES.map((rate) => (
              <div
                key={rate.category}
                className="group relative overflow-hidden rounded-xl border border-[#334155] bg-[#1E293B] p-8 transition-all hover:border-[#FACC15]/50 hover:shadow-lg hover:shadow-[#FACC15]/5"
              >
                <div className="absolute -right-4 -top-4 text-6xl opacity-10 transition-opacity group-hover:opacity-20">
                  {rate.icon}
                </div>
                <div className="relative">
                  <h3 className="text-lg font-semibold">{rate.category}</h3>
                  <p className="mt-1 text-sm text-[#94A3B8]">
                    {rate.description}
                  </p>
                  <div className="mt-6">
                    <span className="text-5xl font-bold text-[#FACC15]">
                      {rate.rate}
                    </span>
                    <span className="ml-1 text-[#94A3B8]">commission</span>
                  </div>
                  <p className="mt-4 text-sm text-[#22C55E]">
                    <CheckCircle2 className="mr-1 inline h-4 w-4" />
                    You keep{" "}
                    <span className="font-semibold">
                      {100 - rate.rateValue}%
                    </span>{" "}
                    of the sale
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Tier Discounts */}
          <div className="mt-12 rounded-xl border border-[#334155] bg-[#1E293B] p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#FACC15]/10">
                <ShieldCheck className="h-6 w-6 text-[#FACC15]" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  Tier-Based Commission Discounts
                </h3>
                <p className="mt-1 text-[#94A3B8]">
                  Level up your PokeVault tier to unlock lower commission rates.
                  The more you trade, the more you save.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {TIER_DISCOUNTS.map((tier) => (
                    <div
                      key={tier.tier}
                      className="rounded-lg border border-[#334155] bg-[#0F172A] p-4 text-center"
                    >
                      <p className={`text-sm font-semibold ${tier.color}`}>
                        {tier.tier}
                      </p>
                      <p className="mt-1 text-2xl font-bold">{tier.discount}</p>
                      <p className="text-xs text-[#94A3B8]">discount</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="border-y border-[#334155] bg-gradient-to-r from-[#FACC15]/10 via-[#1E293B] to-[#EF4444]/10 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">Ready to Start Selling?</h2>
          <p className="mt-4 text-lg text-[#94A3B8]">
            Join thousands of collectors who trust PokeVault to get the best
            value for their cards. Start your first consignment today.
          </p>
          <Link
            href="/consign/submit"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-10 py-4 text-lg font-semibold text-[#0F172A] shadow-lg shadow-[#FACC15]/20 transition-all hover:bg-[#FACC15]/90 hover:shadow-xl hover:shadow-[#FACC15]/30"
          >
            Submit a Consignment
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-[#FACC15]">
              <HelpCircle className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">
                FAQ
              </span>
            </div>
            <h2 className="text-3xl font-bold">Frequently Asked Questions</h2>
          </div>

          <div className="mt-12 space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-[#334155] bg-[#1E293B] transition-colors hover:border-[#FACC15]/30"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-5 text-left font-medium [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDown className="h-5 w-5 shrink-0 text-[#94A3B8] transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 text-[#94A3B8]">{item.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
