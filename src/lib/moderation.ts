/**
 * Text content moderation for listings.
 *
 * Blocks slurs, hate speech, and profanity in user-generated text.
 * Uses normalized matching so leet-speak and spacing tricks are caught.
 */

// Racial slurs & hate speech
const SLURS = [
  "nigger", "nigga", "nigg3r", "n1gger", "n1gga", "niqqer", "niqqa",
  "f4ggot", "faggot", "fag", "f4g", "dyke", "d1ke",
  "kike", "k1ke", "spic", "sp1c", "wetback", "w3tback",
  "chink", "ch1nk", "gook", "g00k", "zipperhead",
  "coon", "c00n", "darkie", "darky",
  "beaner", "b3aner", "towelhead", "raghead", "camelj0ckey",
  "redskin", "r3dskin", "injun",
  "tranny", "tr4nny",
  "retard", "r3tard", "retart",
];

// Profanity / vulgar terms
const PROFANITY = [
  "fuck", "fck", "fuk", "fuq", "f u c k", "phuck", "phuk",
  "shit", "sh1t", "sht", "sh!t",
  "bitch", "b1tch", "b!tch", "biatch",
  "cunt", "c u n t", "kunt",
  "dick", "d1ck", "d!ck",
  "cock", "c0ck",
  "pussy", "puss1", "pu$$y",
  "asshole", "a$$hole", "assh0le",
  "bastard", "b4stard",
  "whore", "wh0re", "h0e",
  "slut", "sl0t", "s1ut",
  "damn", "d4mn",
  "penis", "p3nis",
  "vagina", "vag1na",
  "cum", "jizz", "j1zz",
  "porn", "p0rn",
  "masturbat", "masturb8",
  "blowjob", "bl0wjob",
  "handjob", "h4ndjob",
  "dildo", "d1ldo",
  "anal", "4nal",
  "orgasm", "0rgasm",
  "erection", "er3ction",
  "boobs", "b00bs", "titties", "t1tties", "tits", "t1ts",
];

// Violent / threatening
const VIOLENT = [
  "kill yourself", "kys", "k y s",
  "suicide", "suic1de",
  "murder", "murd3r",
  "rape", "r4pe",
  "molest", "mol3st",
  "pedophile", "p3dophile", "pedo", "p3do",
  "terrorist", "t3rrorist",
  "bomb threat", "shoot up",
  "genocide", "gen0cide",
  "holocaust",
  "lynch",
  "hang yourself",
  "die in a fire",
  "neck yourself",
];

/**
 * Normalize text: lowercase, collapse whitespace, strip common leet substitutions
 * so that "n!gg3r" or "f u c k" etc. are still caught.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_\-.*+?^${}()|[\]\\]/g, "") // strip special chars
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/8/g, "b")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/@/g, "a")
    .replace(/\s+/g, ""); // collapse all whitespace
}

/** Also check with whitespace preserved (for multi-word phrases) */
function normalizeKeepSpaces(text: string): string {
  return text
    .toLowerCase()
    .replace(/[_\-.*+?^${}()|[\]\\]/g, "")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/8/g, "b")
    .replace(/\$/g, "s")
    .replace(/!/g, "i")
    .replace(/@/g, "a")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check text content against all blocklists.
 * Returns { allowed: false, reason } if blocked.
 */
export function moderateText(text: string): ModerationResult {
  if (!text || text.trim().length === 0) {
    return { allowed: true };
  }

  const collapsed = normalize(text);
  const spaced = normalizeKeepSpaces(text);

  // Check slurs (zero tolerance)
  for (const word of SLURS) {
    const normalizedWord = normalize(word);
    if (collapsed.includes(normalizedWord)) {
      return {
        allowed: false,
        reason: "Listing rejected: hate speech or slurs are not allowed.",
      };
    }
  }

  // Check violent / threatening content
  for (const phrase of VIOLENT) {
    const normalizedPhrase = normalize(phrase);
    const normalizedPhraseSpaced = normalizeKeepSpaces(phrase);
    if (collapsed.includes(normalizedPhrase) || spaced.includes(normalizedPhraseSpaced)) {
      return {
        allowed: false,
        reason: "Listing rejected: violent or threatening language is not allowed.",
      };
    }
  }

  // Check profanity
  for (const word of PROFANITY) {
    const normalizedWord = normalize(word);
    if (collapsed.includes(normalizedWord)) {
      return {
        allowed: false,
        reason: "Listing rejected: profanity is not allowed. Please use appropriate language.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Moderate multiple text fields at once (title + description).
 * Returns the first rejection found, or allowed.
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
