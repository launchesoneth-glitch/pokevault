// Bid increments based on current price
export const BID_INCREMENTS = [
  { maxPrice: 24.99, increment: 1 },
  { maxPrice: 99.99, increment: 2 },
  { maxPrice: 249.99, increment: 5 },
  { maxPrice: 499.99, increment: 10 },
  { maxPrice: 999.99, increment: 25 },
  { maxPrice: Infinity, increment: 50 },
] as const;

export function getBidIncrement(currentPrice: number): number {
  const tier = BID_INCREMENTS.find((t) => currentPrice <= t.maxPrice);
  return tier?.increment ?? 50;
}

// XP awards
export const XP_AWARDS = {
  DAILY_LOGIN: 10,
  LOGIN_STREAK_7: 50,
  LOGIN_STREAK_30: 200,
  SUBMIT_CONSIGNMENT: 25,
  SALE_COMPLETED: 50,
  PURCHASE_COMPLETED: 30,
  PLACE_BID: 5,
  WIN_AUCTION: 40,
  FAVORITE_LISTING: 2,
  FOLLOW_USER: 5,
  REFERRAL_PURCHASE: 200,
  LIST_ITEM: 15,
  SELL_ITEM: 50,
  BUY_ITEM: 30,
  LEAVE_REVIEW: 10,
} as const;

// Tier thresholds
export const TIERS = [
  { name: "bronze", xpRequired: 0, volumeRequired: 0, commissionDiscount: 0, min_xp: 0, color: "#CD7F32" },
  {
    name: "silver",
    xpRequired: 1000,
    volumeRequired: 500,
    commissionDiscount: 1,
    min_xp: 1000,
    color: "#94A3B8",
  },
  {
    name: "gold",
    xpRequired: 5000,
    volumeRequired: 2500,
    commissionDiscount: 2,
    min_xp: 5000,
    color: "#FACC15",
  },
  {
    name: "platinum",
    xpRequired: 20000,
    volumeRequired: 10000,
    commissionDiscount: 3,
    min_xp: 20000,
    color: "#06B6D4",
  },
  {
    name: "diamond",
    xpRequired: 50000,
    volumeRequired: Infinity,
    commissionDiscount: 4,
    min_xp: 50000,
    color: "#A855F7",
  },
] as const;

export type TierName =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond";

// Wheel spin prizes with weights
export const WHEEL_PRIZES = [
  { type: "xp_boost", value: "50", label: "50 XP", weight: 30 },
  { type: "xp_boost", value: "100", label: "100 XP", weight: 25 },
  {
    type: "commission_discount",
    value: "5",
    label: "5% Commission Off",
    weight: 20,
  },
  { type: "free_shipping", value: "1", label: "Free Shipping", weight: 10 },
  { type: "xp_boost", value: "200", label: "200 XP", weight: 10 },
  {
    type: "commission_discount",
    value: "10",
    label: "10% Commission Off",
    weight: 4,
  },
  { type: "badge", value: "exclusive", label: "Exclusive Badge", weight: 1 },
] as const;

// Auction
export const ANTI_SNIPE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
export const ANTI_SNIPE_EXTENSION_MS = 2 * 60 * 1000; // 2 minutes

// Offers
export const OFFER_EXPIRY_HOURS = 48;
export const MAX_COUNTER_ROUNDS = 3;

// Card conditions
export const CONDITIONS = [
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Near Mint" },
  { value: "lightly_played", label: "Lightly Played" },
  { value: "moderately_played", label: "Moderately Played" },
  { value: "heavily_played", label: "Heavily Played" },
  { value: "damaged", label: "Damaged" },
] as const;

// Grading companies
export const GRADING_COMPANIES = [
  { value: "psa", label: "PSA" },
  { value: "beckett", label: "Beckett" },
  { value: "cgc", label: "CGC" },
  { value: "sgc", label: "SGC" },
  { value: "tag", label: "TAG" },
  { value: "other", label: "Others" },
] as const;

// Card languages
export const CARD_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
  { value: "es", label: "Spanish" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "jp", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
] as const;
