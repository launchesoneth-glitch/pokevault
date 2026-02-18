/**
 * Text content moderation for listings.
 *
 * Blocks slurs, hate speech, profanity, and targeted violence.
 * Uses aggressive normalization to catch leet-speak, phonetic spelling,
 * spacing tricks, and slang variations.
 */

// ── Normalization ─────────────────────────────────────────────────────────

/**
 * Aggressively normalize text to defeat bypass tricks:
 * - Lowercase
 * - Leet speak (0→o, 1→i, 3→e, 4→a, 5→s, 7→t, 8→b, 9→g)
 * - Symbol substitutions ($→s, @→a, !→i, #→h, +→t)
 * - Phonetic tricks (z→s at end of words, ph→f)
 * - Strip all non-alphanumeric
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ph/g, "f")       // phuck → fuck
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/9/g, "g")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/@/g, "a")
    .replace(/#/g, "h")
    .replace(/\+/g, "t")
    .replace(/[^a-z\s]/g, "")  // strip everything except letters and spaces
    .replace(/\s+/g, "")       // collapse all whitespace
    .replace(/(.)\1{2,}/g, "$1$1"); // collapse 3+ repeated chars → 2 (fuuuck → fuuck)
}

/** Normalize but keep single spaces between words (for phrase matching) */
function normalizeSpaced(text: string): string {
  return text
    .toLowerCase()
    .replace(/ph/g, "f")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/9/g, "g")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/@/g, "a")
    .replace(/#/g, "h")
    .replace(/\+/g, "t")
    .replace(/z/g, "s")
    .replace(/x/g, "ks")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Word lists ────────────────────────────────────────────────────────────
// After normalization, "z" becomes "s", "3" becomes "e", etc.
// So we only need the canonical normalized form.

const SLURS = [
  // N-word variants
  "nigger", "nigga", "niggaz", "niggas", "nigger", "niqqa", "niqqer", "negro",
  // Anti-gay
  "faggot", "fagot", "faggots", "fag", "fags",
  "dyke", "dykes",
  // Anti-semitic
  "kike", "kikes",
  // Anti-hispanic
  "spic", "spik", "spics", "wetback", "wetbacks", "beaner", "beaners",
  // Anti-asian
  "chink", "chinks", "gook", "gooks", "zipperhead",
  // Anti-black
  "coon", "coons", "darkie", "darky", "jigaboo", "jiggaboo", "sambo",
  // Anti-arab/middle eastern
  "towelhead", "raghead", "cameljockey", "sandnigger",
  // Anti-native
  "redskin", "redskins", "injun",
  // Anti-trans
  "tranny", "trannies",
  // Ableist
  "retard", "retards", "retart", "retarted", "retarded",
  // Anti-white (for completeness)
  "cracker", "crackers",
  // Anti-romani
  "gypsy", "gypsies",
];

const PROFANITY = [
  "fuck", "fuk", "fuq", "fck",
  "shit", "sht",
  "bitch", "biatch",
  "cunt", "kunt",
  "cock",
  "pussy",
  "asshole",
  "bastard",
  "whore", "hoe",
  "slut",
  "dick",
  "penis",
  "vagina",
  "cum", "jiss",
  "porn",
  "masturbat",
  "blowjob",
  "handjob",
  "dildo",
  "orgasm",
  "erection",
  "boobs", "titties", "tits",
];

// Violent actions (used both standalone and in combo with targets)
const VIOLENT_ACTIONS = [
  "kill", "murder", "slaughter", "exterminate", "eradicate",
  "execute", "hang", "lynch", "burn", "shoot", "stab",
  "rape", "molest", "bomb", "nuke", "gas", "destroy",
  "genocide", "ethnic cleansing", "ethnically cleanse",
  "behead", "decapitate", "torture", "strangle", "drown",
  "beat up", "curb stomp",
];

// Target groups — when combined with violent actions = hate speech
const TARGET_GROUPS = [
  // Religious (with z-ending variants)
  "jews", "jewz", "jewish", "jew", "muslim", "muslims", "muslimz", "islam", "islamic",
  "christian", "christians", "hindu", "hindus", "sikh", "sikhs",
  // Racial/ethnic
  "blacks", "blackz", "black people", "white people", "whites", "whitez",
  "asians", "asianz", "asian people", "hispanics", "hispanic people",
  "mexicans", "mexicanz", "arabs", "arabz", "arab people", "chinese", "indian",
  "africans", "african people",
  // Sexual orientation
  "gays", "gayz", "gay people", "lesbians", "lesbianz", "lesbian people",
  "homosexuals", "bisexuals", "queers", "queerz", "lgbtq", "lgbt",
  "trans people", "transgender", "transsexuals",
  // Gender
  "women", "men", "females", "males",
  // Disability
  "disabled", "disabled people", "autistic", "autistic people",
  // Nationality (common targets)
  "americans", "immigrants", "immigrantz", "refugees",
];

// Standalone violent/threatening phrases
const VIOLENT_PHRASES = [
  "kill yourself", "kys",
  "suicide",
  "pedophile", "pedo",
  "terrorist",
  "bomb threat", "shoot up", "shooting up",
  "school shooting", "mass shooting",
  "holocaust",
  "hang yourself", "neck yourself",
  "die in a fire",
  "go die",
  "hope you die",
  "white power", "white supremacy", "white pride",
  "heil hitler", "sieg heil", "hail hitler",
  "race war",
  "final solution",
  "death to",
  "gas the",
  "oven the",
];

// Slang substitutions for common words used in hate speech
// Applied before checking phrases: "da" → "the", "dem" → "them", etc.
function expandSlang(text: string): string {
  return text
    .replace(/\bda\b/g, "the")
    .replace(/\bdem\b/g, "them")
    .replace(/\bdey\b/g, "they")
    .replace(/\bdat\b/g, "that")
    .replace(/\bdis\b/g, "this")
    .replace(/\bwit\b/g, "with")
    .replace(/\bur\b/g, "your")
    .replace(/\bu\b/g, "you")
    .replace(/\br\b/g, "are")
    .replace(/\bm8\b/g, "mate")
    .replace(/\ball\b/g, "all");
}

// ── Moderation logic ──────────────────────────────────────────────────────

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

export function moderateText(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { allowed: true };
  }

  const collapsed = normalize(text);
  const spaced = normalizeSpaced(text);
  const expandedSpaced = expandSlang(spaced);

  // Also create a z→s variant for matching "jewz" → "jews" etc.
  const collapsedZtoS = collapsed.replace(/z/g, "s");

  // 1. Check slurs (zero tolerance) — check both original and z→s variant
  for (const slur of SLURS) {
    const norm = normalize(slur);
    if (collapsed.includes(norm) || collapsedZtoS.includes(norm)) {
      return {
        allowed: false,
        reason: "Listing rejected: hate speech or slurs are not allowed.",
      };
    }
  }

  // 2. Check targeted violence: violent action + target group
  const expandedCollapsed = expandedSpaced.replace(/\s+/g, "");
  const expandedCollapsedZtoS = expandedCollapsed.replace(/z/g, "s");

  for (const action of VIOLENT_ACTIONS) {
    const normAction = normalize(action);

    // Check if any variant of the text contains the action
    const hasAction =
      collapsed.includes(normAction) ||
      collapsedZtoS.includes(normAction) ||
      expandedCollapsed.includes(normAction) ||
      expandedCollapsedZtoS.includes(normAction);

    if (!hasAction) continue;

    for (const group of TARGET_GROUPS) {
      const normGroup = normalize(group);
      const hasGroup =
        collapsed.includes(normGroup) ||
        collapsedZtoS.includes(normGroup) ||
        expandedCollapsed.includes(normGroup) ||
        expandedCollapsedZtoS.includes(normGroup);

      if (hasGroup) {
        return {
          allowed: false,
          reason: "Listing rejected: hate speech or targeted violence is not allowed.",
        };
      }
    }
  }

  // 4. Check standalone violent phrases
  for (const phrase of VIOLENT_PHRASES) {
    const normPhrase = normalize(phrase);
    const normPhraseSpaced = normalizeSpaced(phrase);
    if (collapsed.includes(normPhrase) || expandedSpaced.includes(normPhraseSpaced)) {
      return {
        allowed: false,
        reason: "Listing rejected: violent or threatening language is not allowed.",
      };
    }
  }

  // 5. Check profanity
  for (const word of PROFANITY) {
    const norm = normalize(word);
    if (collapsed.includes(norm)) {
      return {
        allowed: false,
        reason: "Listing rejected: profanity is not allowed. Please use appropriate language.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Moderate title + description together.
 */
export function moderateListingText(
  title: string,
  description?: string | null
): ModerationResult {
  const titleCheck = moderateText(title);
  if (!titleCheck.allowed) return titleCheck;

  if (description) {
    const descCheck = moderateText(description);
    if (!descCheck.allowed) return descCheck;
  }

  return { allowed: true };
}
