#!/usr/bin/env node
/**
 * JoyPulse RSS Scraper
 *
 * Standalone script — run via `node scripts/scrape-news.mjs`
 * Fetches RSS feeds, applies positivity scoring, deduplicates, and
 * writes the result to public/feed.json as a static asset.
 *
 * Designed to be executed by a GitHub Action on a cron schedule.
 * NO database, NO server — pure file output.
 */

import Parser from "rss-parser";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "..", "public", "feed.json");

// ═══════════════════════════════════════════════════════════════════
// LLM CLASSIFICATION — second-pass sentiment check via OpenRouter
//
// The keyword scorer above is a cheap first-pass gate: fast, free, and
// good at throwing out obvious junk before we spend any API calls. But
// it can't understand context, tone, or nuance — it can be fooled by a
// single word in an otherwise negative story.
//
// This step sends only the keyword-survivors to a free OpenRouter model
// for a real judgment call. Only used once daily, so speed doesn't
// matter — we try a short list of free models in order and fall
// through to the next if one is unavailable or rate-limited that day.
//
// NOTE: OpenRouter's free-tier model lineup shifts over time. Review
// this list periodically at https://openrouter.ai/models?max_price=0
// and swap in current, capable free models as needed.
// ═══════════════════════════════════════════════════════════════════
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const CANDIDATE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-24b-instruct-2501:free",
  "deepseek/deepseek-chat:free",
];

const CLASSIFY_SYSTEM_PROMPT = `You are a strict editorial filter for JoyPulse, an Asia-focused "good news only" publication.
Given a headline and short summary, decide whether this is a GENUINELY uplifting, heartwarming, or positive story — not merely a story that happens to contain a positive-sounding word.

STRICT REJECT criteria (approved: false):
- Primarily about tragedy, disaster, crime, conflict, illness, death, or accidents — even if a small silver lining or recovery is mentioned
- Business, finance, economic, or political news with no real human-interest or uplifting angle (ignore words like "record", "growth", "surge", "target", "expansion")
- Sports results that are only scores or match outcomes with no human story
- Mixed, bittersweet, or "despite the hardship" stories where negative framing dominates
- Fear, controversy, outrage, protest, or criticism-driven pieces
- Stories that feel neutral or only mildly positive

APPROVE criteria (approved: true):
- Genuinely heartwarming acts of kindness, rescue, recovery, generosity, or community solidarity
- Real scientific, medical, environmental, or technological breakthroughs with clear positive human or planetary impact
- Uplifting human-achievement, cultural, arts, or educational stories
- Wholesome, feel-good stories with no significant negative framing
- Positive nature, conservation, or animal welfare stories that inspire

Also return a positivity score from 1-10 (10 = pure joy / deeply moving; 7-9 = clearly uplifting; 5-6 = borderline; below 5 should usually be rejected).

Respond with ONLY a JSON object, no other text:
{"approved": true or false, "score": 1-10, "confidence": "high" or "medium" or "low", "reason": "one short sentence"}`;

// Overall wall-clock budget for ALL LLM classification calls combined, across
// the whole run. Once exceeded, remaining candidates fall back to keyword-only
// results instead of queueing more LLM calls — keeps total runtime predictable
// no matter how many articles pass the keyword filter.
const LLM_TIME_BUDGET_MS = 12 * 60 * 1000; // 12 minutes, leaves headroom under the 20-min job timeout
let llmBudgetExhausted = false;
let llmBudgetStart = null;

async function classifyWithLLM(title, summary) {
  if (!OPENROUTER_API_KEY) return null; // No key configured — caller falls back to keyword result

  if (llmBudgetStart === null) llmBudgetStart = Date.now();
  if (llmBudgetExhausted) return null;
  if (Date.now() - llmBudgetStart > LLM_TIME_BUDGET_MS) {
    llmBudgetExhausted = true;
    console.log("   ⏱ LLM time budget exhausted — remaining articles will use keyword-only results.");
    return null;
  }

  const userPrompt = `Headline: ${title}\nSummary: ${summary}`;

  for (const model of CANDIDATE_MODELS) {
    const controller = new AbortController();
    // IMPORTANT: this timer must stay armed through res.json(), not just the
    // initial fetch(). fetch() resolves as soon as HEADERS arrive — if we
    // clear the timer at that point, a stalled response BODY (a model that's
    // slow/queued under free-tier load) has zero timeout protection and can
    // hang indefinitely. The timer is only cleared once we're fully done
    // with this model's response, in the finally block below.
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0,
          max_tokens: 150,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // 429 = rate limited, 402 = out of free credits, etc. — try next model.
        console.log(`   ⚠ ${model} unavailable (status ${res.status}), trying next model…`);
        continue;
      }

      const data = await res.json(); // still covered by the same abort signal/timer
      const raw = data?.choices?.[0]?.message?.content?.trim() || "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log(`   ⚠ ${model} returned unparseable output, trying next model…`);
        continue;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (typeof parsed.approved !== "boolean") {
        console.log(`   ⚠ ${model} returned malformed JSON, trying next model…`);
        continue;
      }

      return {
        approved: parsed.approved,
        score: typeof parsed.score === "number" ? Math.max(1, Math.min(10, parsed.score)) : (parsed.approved ? 7 : 3),
        confidence: parsed.confidence || "unknown",
        reason: parsed.reason || "",
        model,
      };
    } catch (err) {
      console.log(`   ⚠ ${model} failed (${err.message}), trying next model…`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Every candidate model failed — signal "no verdict" so the caller can
  // fall back to the keyword-only result rather than losing the article.
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// RSS FEED LIST — Singapore first, then Asia, then positive-news
// ═══════════════════════════════════════════════════════════════════
const RSS_FEEDS = [
  // ── Singapore (highest priority) ──────────────────────────────
  { url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6511",  name: "CNA Singapore",       region: "singapore" },
  { url: "https://mothership.sg/feed/",                                                          name: "Mothership SG",        region: "singapore" },
  { url: "https://www.straitstimes.com/news/singapore/rss.xml",                                  name: "Straits Times SG",     region: "singapore" },

  // ── Malaysia ───────────────────────────────────────────────────
  { url: "https://www.freemalaysiatoday.com/feed/",                                              name: "Free Malaysia Today",  region: "asia" },
  // NOTE: "The Star Malaysia" removed — the guessed URL 404'd and I don't have
  // a network-verified working RSS URL for them. Free Malaysia Today still
  // covers Malaysia.

  // ── Indonesia ──────────────────────────────────────────────────
  { url: "https://jakartaglobe.id/feed/",                                                         name: "Jakarta Globe",        region: "asia" }, // NOTE: unverified — original URL 404'd, this is a best-guess retry
  { url: "https://en.antaranews.com/rss/",                                                        name: "Antara News",          region: "asia" },

  // ── Philippines ────────────────────────────────────────────────
  { url: "https://www.rappler.com/feed/",                                                         name: "Rappler",              region: "asia" },

  // ── Thailand ───────────────────────────────────────────────────
  { url: "https://www.bangkokpost.com/rss/data/topstories.xml",                                   name: "Bangkok Post",         region: "asia" },

  // ── Vietnam ────────────────────────────────────────────────────
  { url: "https://e.vnexpress.net/rss/news.rss",                                                  name: "VnExpress Int'l",      region: "asia" },

  // ── Broader Asia ───────────────────────────────────────────────
  { url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6936",  name: "CNA Asia",             region: "asia"      },
  { url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6311",  name: "CNA World",            region: "world"     },
  { url: "https://www.thebetterindia.com/feed/",                                                 name: "The Better India",     region: "asia",      isPositiveFeed: true },
  // India / South Asia extras
  { url: "https://www.indiatoday.in/rss/1206578",                                                name: "India Today Positive", region: "asia" },
  // Hong Kong / East Asia
  { url: "https://www.scmp.com/rss/91/feed",                                                     name: "SCMP Asia",            region: "asia" },

  // ── Dedicated positive-news sources (already curated — lower threshold) ─
  { url: "https://www.goodnewsnetwork.org/feed/",                                                name: "Good News Network",    region: "world",     isPositiveFeed: true },
  { url: "https://www.positive.news/feed/",                                                      name: "Positive News",        region: "world",     isPositiveFeed: true },
  { url: "https://www.goodgoodgood.co/articles/rss.xml",                                         name: "Good Good Good",       region: "world",     isPositiveFeed: true },
  { url: "https://reasonstobecheerful.world/feed/",                                               name: "Reasons to be Cheerful", region: "world",   isPositiveFeed: true },
  { url: "https://www.optimistdaily.com/feed/",                                                   name: "Optimist Daily",       region: "world",     isPositiveFeed: true },
  { url: "https://tanksgoodnews.com/feed/",                                                        name: "Tank's Good News",     region: "world",     isPositiveFeed: true },
  { url: "https://www.dailygood.org/rss/dg/",                                                     name: "DailyGood",            region: "world",     isPositiveFeed: true },
];

// ═══════════════════════════════════════════════════════════════════
// POSITIVE PATTERNS — keywords by category, each with a score weight
// ═══════════════════════════════════════════════════════════════════
const POSITIVE_PATTERNS = {
  humanity: [
    "kindness", "kind", "generous", "generosity", "donate", "donated", "donation",
    "volunteer", "charity", "help", "helped", "helping", "rescue", "rescued",
    "hero", "heroic", "save", "saved", "saving", "community", "reunite", "reunited",
    "forgive", "compassion", "selfless", "brave", "bravery", "courage", "courageous",
    "inspire", "inspiring", "inspirational", "uplift", "uplifting", "heartwarming",
    "wholesome", "mentor", "support", "solidarity", "empathy", "grateful", "gratitude",
    "thank", "thanks", "thanksgiving", "pay it forward", "good samaritan",
    "foster", "adopt", "adopted", "shelter", "food bank", "free meal", "free meals",
  ],
  science: [
    "breakthrough", "discover", "discovered", "discovery", "innovation", "innovate",
    "invent", "invented", "invention", "research", "researcher", "scientist",
    "cure", "treatment", "therapy", "vaccine", "medical", "medicine",
    "technology", "tech", "ai", "artificial intelligence", "robot", "solar",
    "renewable", "clean energy", "electric", "battery", "quantum", "space",
    "nasa", "satellite", "mars", "moon", "fusion", "genome", "stem cell",
    "biotech", "startup", "launch", "patent", "prototype", "clinical trial",
  ],
  nature: [
    "conservation", "conserve", "wildlife", "endangered", "species", "habitat",
    "reforestation", "plant", "planted", "planting", "tree", "trees", "forest",
    "ocean", "marine", "coral", "reef", "recycle", "recycling", "sustainable",
    "biodiversity", "ecosystem", "green", "eco", "environment", "environmental",
    "clean", "pollution", "carbon", "emission", "climate", "nature", "natural",
    "animal", "animals", "turtle", "whale", "elephant", "panda", "tiger",
    "bird", "butterfly", "bee", "bees", "pollinator", "garden", "park",
  ],
  sports: [
    "champion", "championship", "medal", "gold medal", "silver medal",
    "record", "world record", "olympic", "olympics", "tournament", "victory",
    "win", "won", "winner", "triumph", "sportsmanship", "athlete", "team",
    "marathon", "football", "soccer", "basketball", "swimming", "tennis",
    "badminton", "rugby", "cricket", "goal", "score", "trophy",
  ],
  arts: [
    "art", "artist", "music", "musician", "concert", "festival", "film",
    "movie", "cinema", "theatre", "theater", "dance", "dancer", "sing",
    "singer", "song", "album", "book", "author", "novel", "poetry",
    "painting", "sculpture", "exhibition", "gallery", "museum",
    "culture", "cultural", "heritage", "tradition", "craft", "design",
    "architecture", "photography", "award", "grammy", "oscar", "emmy",
  ],
};

// ═══════════════════════════════════════════════════════════════════
// NEGATIVE FILTER PATTERNS — articles matching these are excluded
// ═══════════════════════════════════════════════════════════════════
const NEGATIVE_FILTER_PATTERNS = [
  "kill", "killed", "killing", "murder", "murdered", "dead", "death", "die", "dies", "died",
  "war", "warfare", "attack", "attacked", "bomb", "bombing", "bombed",
  "terror", "terrorist", "terrorism", "shooting", "shot", "gunfire", "gunman",
  "crash", "crashed", "fatal", "fatality", "victim", "victims",
  "violence", "violent", "abuse", "abused", "abusive",
  "rape", "raped", "assault", "assaulted", "molest",
  "suicide", "suicidal", "kidnap", "kidnapped", "kidnapping",
  "crime", "criminal", "felony", "homicide", "manslaughter",
  "scandal", "scandalous", "fraud", "fraudulent", "corrupt", "corruption",
  "scam", "scammed", "arrested", "arrest", "jail", "jailed",
  "prison", "prisoner", "inmate", "drug bust", "drugs", "overdose",
  "catastrophe", "catastrophic", "disaster", "disastrous",
  "earthquake", "tsunami", "flood", "flooded", "flooding",
  "famine", "drought", "wildfire", "fire",
  "explosion", "exploded", "collapse", "collapsed",
  "recession", "bankruptcy", "bankrupt", "layoff", "layoffs",
  "fired", "downturn", "slump", "crisis",
  "pandemic", "outbreak", "infection", "infected",
  "cancer", "tumor", "tumour", "disease", "plague", "epidemic",
  "execution", "executed", "massacre", "genocide", "refugee",
  "coup", "overthrow", "stabbing", "stabbed",
  "arson", "robbery", "theft", "stolen", "mourning", "mourn",
  "hostage", "siege", "sanctions", "embargo", "missile", "nuke", "nuclear weapon",
  "torture", "tortured", "trafficking", "trafficked",
  "extremist", "extremism", "militia", "insurgent", "rebel",
  "derail", "derailed", "wreck", "wrecked", "collide", "collision",
  "drown", "drowned", "drowning", "suffocate",
  "evict", "evicted", "demolish", "demolished",
  "protest", "riot", "rioting", "clash", "clashes",
  "threaten", "threatened", "threatening",
  "indict", "indicted", "prosecute", "prosecuted", "convicted", "conviction",
  "sentenced", "sentencing", "penalty", "death penalty",
];

// ═══════════════════════════════════════════════════════════════════
// LOCATION DETECTION — maps keywords in text to a country/location
// ═══════════════════════════════════════════════════════════════════
const LOCATION_MAP = [
  { keywords: ["singapore", "singaporean", "sg", "merlion", "changi", "sentosa", "orchard road", "marina bay", "hdb", "hawker"], location: "Singapore", region: "singapore" },
  { keywords: ["malaysia", "malaysian", "kuala lumpur", "penang", "sabah", "sarawak", "johor", "malacca"], location: "Malaysia", region: "asia" },
  { keywords: ["indonesia", "indonesian", "jakarta", "bali", "java", "sumatra", "borneo"], location: "Indonesia", region: "asia" },
  { keywords: ["thailand", "thai", "bangkok", "chiang mai", "phuket"], location: "Thailand", region: "asia" },
  { keywords: ["vietnam", "vietnamese", "hanoi", "ho chi minh", "saigon"], location: "Vietnam", region: "asia" },
  { keywords: ["philippines", "filipino", "manila", "cebu", "davao"], location: "Philippines", region: "asia" },
  { keywords: ["japan", "japanese", "tokyo", "osaka", "kyoto", "hokkaido"], location: "Japan", region: "asia" },
  { keywords: ["south korea", "korean", "seoul", "busan", "k-pop", "kpop"], location: "South Korea", region: "asia" },
  { keywords: ["india", "indian", "delhi", "mumbai", "bangalore", "chennai", "kolkata", "hyderabad"], location: "India", region: "asia" },
  { keywords: ["china", "chinese", "beijing", "shanghai", "guangzhou", "shenzhen", "hong kong"], location: "China", region: "asia" },
  { keywords: ["taiwan", "taiwanese", "taipei"], location: "Taiwan", region: "asia" },
  { keywords: ["myanmar", "burmese", "yangon"], location: "Myanmar", region: "asia" },
  { keywords: ["cambodia", "cambodian", "phnom penh"], location: "Cambodia", region: "asia" },
  { keywords: ["laos", "vientiane"], location: "Laos", region: "asia" },
  { keywords: ["bangladesh", "dhaka"], location: "Bangladesh", region: "asia" },
  { keywords: ["sri lanka", "colombo"], location: "Sri Lanka", region: "asia" },
  { keywords: ["nepal", "kathmandu"], location: "Nepal", region: "asia" },
  { keywords: ["australia", "australian", "sydney", "melbourne", "brisbane"], location: "Australia", region: "world" },
  { keywords: ["new zealand", "auckland", "wellington"], location: "New Zealand", region: "world" },
];

/**
 * Pull the best available image URL from a parsed RSS item.
 * Covers enclosure, media:content/thumbnail, itunes:image, and <img> tags
 * inside content / content:encoded / description / summary.
 */
function extractImageUrl(item) {
  const candidates = [];

  const push = (url) => {
    if (!url || typeof url !== "string") return;
    const cleaned = url.trim().replace(/&amp;/g, "&");
    if (!/^https?:\/\//i.test(cleaned)) return;
    // Skip tracking pixels / tiny placeholders
    if (/1x1|pixel|spacer|blank\.gif|transparent/i.test(cleaned)) return;
    candidates.push(cleaned);
  };

  // enclosure (often the hero image)
  if (item.enclosure?.url) push(item.enclosure.url);
  if (Array.isArray(item.enclosures)) {
    for (const e of item.enclosures) push(e?.url);
  }

  // media:content — can be object or array; may nest under media:group
  const mediaContents = []
    .concat(item["media:content"] || [])
    .concat(item["media:group"]?.["media:content"] || []);
  for (const m of mediaContents) {
    push(m?.$?.url || m?.url);
  }

  // media:thumbnail
  const thumbs = [].concat(item["media:thumbnail"] || []);
  for (const t of thumbs) push(t?.$?.url || t?.url);

  // itunes:image
  push(item["itunes:image"]?.$?.href || item["itunes:image"]?.href);

  // image field some feeds use
  push(item.image?.url || item.image);

  // HTML bodies
  const htmlBlobs = [
    item.content,
    item["content:encoded"],
    item.description,
    item.summary,
  ].filter(Boolean);

  for (const html of htmlBlobs) {
    // Prefer larger images if width/height attrs hint at size
    const imgTags = String(html).matchAll(/<img[^>]+>/gi);
    for (const match of imgTags) {
      const tag = match[0];
      const srcMatch = tag.match(/(?:src|data-src|data-lazy-src)=["']([^"']+)["']/i);
      if (srcMatch) push(srcMatch[1]);
    }
    // og-style or background urls sometimes appear
    const urlMatch = String(html).match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"'<>]*)?/i);
    if (urlMatch) push(urlMatch[0]);
  }

  // Prefer URLs that look like real article images (not icons/logos)
  const ranked = candidates.sort((a, b) => {
    const score = (u) => {
      let s = 0;
      if (/\.(jpg|jpeg|png|webp)/i.test(u)) s += 2;
      if (/\/\d{3,4}x\d{3,4}|width=\d{3}|w=\d{3}/i.test(u)) s += 1;
      if (/logo|icon|avatar|profile|sprite/i.test(u)) s -= 5;
      return s;
    };
    return score(b) - score(a);
  });

  return ranked[0] || null;
}

function detectLocation(text) {
  const lower = text.toLowerCase();
  for (const entry of LOCATION_MAP) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw)) {
        return { location: entry.location, region: entry.region };
      }
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════
// SCORING — returns { score, category } or null if negative
// ═══════════════════════════════════════════════════════════════════
// Cache compiled regexes so we don't rebuild them per-article
const _wordBoundaryCache = new Map();
function matchesWord(text, phrase) {
  // Multi-word phrases (e.g. "pay it forward") match fine with simple includes.
  // Single short tokens (e.g. "ai", "eco", "art") MUST use word boundaries,
  // otherwise they false-positive inside unrelated words like "said", "daily",
  // "economy", "quarter". \b works correctly for both cases since spaces are
  // non-word characters too.
  let re = _wordBoundaryCache.get(phrase);
  if (!re) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    re = new RegExp(`\\b${escaped}\\b`, "i");
    _wordBoundaryCache.set(phrase, re);
  }
  return re.test(text);
}

function scoreArticle(title, summary, isPositiveFeed = false) {
  const combined = `${title} ${summary}`.toLowerCase();

  // Reject if any negative pattern matches
  for (const neg of NEGATIVE_FILTER_PATTERNS) {
    if (matchesWord(combined, neg)) return null;
  }

  // Also reject vague/short items
  if (title.length < 20) return null;

  // Additional negative context patterns (phrases, not just words)
  const extraNegative = [
    "sex charge", "sex offence", "sentenced to", "faces charges",
    "charged with", "accused of", "under investigation", "probe",
    "crackdown", "controversial", "backlash", "fury", "outrage",
    "fears", "worried", "concern", "troubl", "tension",
    "surge in price", "price surge", "soar", "spike in cost",
    "unrest", "instabil", "turmoil",
    "typhoon", "hurricane", "cyclone", "storm",
    "heatwave", "heat wave", "extreme heat",
    "raid", "seize", "seized",
    "fiasco", "overkill", "pushback", "push back",
    "extradition", "deport",
  ];
  for (const neg of extraNegative) {
    if (matchesWord(combined, neg)) return null;
  }

  // Score each category
  let bestCategory = "humanity";
  let bestScore = 0;

  for (const [cat, patterns] of Object.entries(POSITIVE_PATTERNS)) {
    let score = 0;
    for (const pat of patterns) {
      if (matchesWord(combined, pat)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
    }
  }

  // Dedicated positive-news sources (Good News Network, Positive News, etc.)
  // are already editorially curated, so 1 keyword hit is enough confirmation.
  // General news feeds (CNA, Mothership) need a stronger signal — require 2+
  // matches, since a single generic word is too easy to false-positive on.
  const threshold = isPositiveFeed ? 1 : 2;
  if (bestScore < threshold) return null;

  return { score: bestScore, category: bestCategory };
}

// ═══════════════════════════════════════════════════════════════════
// SUMMARY GENERATION — longer, readable write-ups (~400 chars)
// so readers can understand the story before opening the full article.
// ═══════════════════════════════════════════════════════════════════
function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function makeSummary(item, maxLen = 420) {
  // Prefer longer body fields so we get a real write-up, not a teaser line
  const candidates = [
    item.contentSnippet,
    item.summary,
    item.description,
    item.content,
    item["content:encoded"],
  ]
    .map(stripHtml)
    .filter((s) => s && s.length >= 20)
    .sort((a, b) => b.length - a.length); // longest first

  const clean = candidates[0] || "";
  if (!clean) return "";
  if (clean.length <= maxLen) return clean;

  // Prefer ending on a sentence boundary when possible
  const truncated = clean.slice(0, maxLen);
  const lastSentence = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("! "),
    truncated.lastIndexOf("? ")
  );
  if (lastSentence > maxLen * 0.5) {
    return truncated.slice(0, lastSentence + 1).trim();
  }
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? truncated.slice(0, lastSpace) : truncated).trim() + "…";
}

// ═══════════════════════════════════════════════════════════════════
// DEDUP — by title hash
// ═══════════════════════════════════════════════════════════════════
function makeId(title) {
  // Normalize entity encoding before hashing — otherwise the same article
  // can get two different IDs across runs if one XML parse left "&amp;"
  // un-decoded and another correctly decoded it to "&". Found via a live
  // duplicate: "...Water & Money" vs "...Water &amp; Money" hashing differently.
  const normalized = title.toLowerCase().trim().replace(/&amp;/g, "&");
  return createHash("md5").update(normalized).digest("hex").slice(0, 12);
}

// ═══════════════════════════════════════════════════════════════════
// XML SANITIZATION — some feeds (e.g. Mothership SG, Antara News) ship
// mildly invalid XML: bare "&" characters that aren't valid entities, or
// stray control characters. Rather than failing outright on these feeds,
// clean the raw XML before handing it to the parser.
// ═══════════════════════════════════════════════════════════════════
function sanitizeXml(xml) {
  // Escape bare "&" that isn't already part of a valid XML entity
  let cleaned = xml.replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/g, "&amp;");
  // Strip invalid XML control characters (keep tab \x09, LF \x0A, CR \x0D)
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return cleaned;
}

async function fetchAndParseFeed(parser, url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "JoyPulse/1.0 (positive-news-aggregator)" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Status code ${res.status}`);
    const rawXml = await res.text();
    return await parser.parseString(sanitizeXml(rawXml));
  } finally {
    clearTimeout(timeoutId);
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN SCRAPE LOGIC
// ═══════════════════════════════════════════════════════════════════
async function scrapeAllFeeds() {
  if (!OPENROUTER_API_KEY) {
    console.log("⚠ OPENROUTER_API_KEY not set — running keyword-filter only, no LLM sentiment check.\n");
  } else {
    console.log("🤖 LLM sentiment verification enabled (OpenRouter).\n");
  }

  // Note: timeout/headers/maxRedirects now live in fetchAndParseFeed() above,
  // since we do our own fetch + XML sanitization before handing raw text to
  // the parser (parser.parseString doesn't take these options).
  const parser = new Parser();

  const allArticles = [];
  const seenIds = new Set();

  // Load existing feed to merge & dedup
  let existing = [];
  if (existsSync(OUTPUT_PATH)) {
    try {
      const raw = readFileSync(OUTPUT_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      existing = parsed.articles || [];
      for (const a of existing) seenIds.add(a.id);
    } catch { /* fresh start */ }
  }

  for (const feed of RSS_FEEDS) {
    console.log(`📡 Fetching ${feed.name} …`);
    try {
      const result = await fetchAndParseFeed(parser, feed.url);
      const items = result.items || [];
      console.log(`   → ${items.length} items from ${feed.name}`);

      for (const item of items) {
        const title = (item.title || "").trim();
        if (!title) continue;

        const id = makeId(title);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const summary = makeSummary(item);

        // Skip items with no usable summary — a bare headline with a blank
        // body reads badly on a card and we can't verify positivity of the
        // full story from the title alone.
        if (!summary || summary.length < 20) continue;

        const scoring = scoreArticle(title, summary, feed.isPositiveFeed === true);
        if (!scoring) continue;

        // Second-pass: ask an LLM to sanity-check the keyword filter's call.
        // If no API key is set, or every candidate model is unavailable,
        // fall back to trusting the keyword result rather than dropping
        // the article entirely — degrade gracefully, don't fail the run.
        const verdict = await classifyWithLLM(title, summary);
        let llmVerified = false;
        let llmScore = null;
        let llmReason = "";
        let llmModel = null;

        if (verdict) {
          if (!verdict.approved || (verdict.score && verdict.score < 6)) {
            console.log(`   ✗ LLM rejected: "${title.slice(0, 60)}…" (score=${verdict.score ?? "n/a"}, ${verdict.reason})`);
            continue;
          }
          llmVerified = true;
          llmScore = verdict.score;
          llmReason = verdict.reason;
          llmModel = verdict.model;
        }

        // Detect location from title + summary text
        const fullText = `${title} ${summary} ${feed.name}`;
        const loc = detectLocation(fullText);
        const region = loc?.region || feed.region;
        const location = loc?.location || (feed.region === "singapore" ? "Singapore" : feed.region === "asia" ? "Asia" : "World");

        // Extract image — try many common RSS fields so fewer stories fall back
        // to generic placeholders on the frontend.
        const imageUrl = extractImageUrl(item);

        allArticles.push({
          id,
          title,
          summary,
          source: feed.name,
          sourceUrl: item.link || item.guid || null,
          category: scoring.category,
          score: scoring.score,
          llmVerified,
          llmScore,
          llmReason,
          llmModel,
          region,
          location,
          imageUrl,
          pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`   ✗ Failed to fetch ${feed.name}: ${err.message}`);
    }
  }

  console.log(`\n✅ New positive articles found: ${allArticles.length}`);
  const verifiedCount = allArticles.filter((a) => a.llmVerified).length;
  if (allArticles.length > 0) {
    console.log(`   → ${verifiedCount} LLM-verified, ${allArticles.length - verifiedCount} keyword-only`);
  }

  // Merge with existing, dedup, sort by date, cap at 500
  const merged = [...allArticles, ...existing];
  const dedupMap = new Map();
  for (const a of merged) {
    if (!dedupMap.has(a.id)) dedupMap.set(a.id, a);
  }

  const final = Array.from(dedupMap.values())
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 500);

  const output = {
    lastUpdated: new Date().toISOString(),
    count: final.length,
    articles: final,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(`📝 Wrote ${final.length} articles to ${OUTPUT_PATH}`);
  console.log(`🕐 Last updated: ${output.lastUpdated}`);
}

scrapeAllFeeds().catch((err) => {
  console.error("Fatal scrape error:", err);
  process.exit(1);
});
