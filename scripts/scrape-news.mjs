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
const REJECT_LOG_PATH = resolve(__dirname, "..", "public", "reject-log.json");
const REJECT_LOG_RETENTION_MS = 7 * 24 * 3600 * 1000; // 7 days

// ═══════════════════════════════════════════════════════════════════
// LLM CLASSIFICATION — second-pass sentiment check via OpenRouter
//
// The keyword scorer above is a cheap first-pass gate: fast, free, and
// good at throwing out obvious junk before we spend any API calls. But
// it can't understand context, tone, or nuance — it can be fooled by a
// single word in an otherwise negative story.
//
// Keyword survivors go to the LLM. Stories that hit a negative keyword
// are NOT auto-killed — they are soft-blocked and sent to the LLM so
// recovery arcs ("cancer survivor", "rebuilt after the flood") can still
// pass if the story ends better than it started. Reject reasons are
// logged for 7 days in public/reject-log.json for false-negative review.
//
// NOTE: OpenRouter's free-tier model lineup shifts over time. Review
// this list periodically at https://openrouter.ai/models?max_price=0
// and swap in current, capable free models as needed.
// ═══════════════════════════════════════════════════════════════════
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Free-tier model IDs change on OpenRouter — cascade of current :free chat models.
// If one returns 404, the scraper tries the next.
const CANDIDATE_MODELS = [
  "openrouter/free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "z-ai/glm-5.2:free",
];

const CLASSIFY_SYSTEM_PROMPT = `You are a strict editorial filter for JoyPulse, an Asia-focused "good news only" publication.
Given a headline and short summary, decide whether this is a GENUINELY uplifting, heartwarming, or positive story — not merely a story that happens to contain a positive-sounding word.

RECOVERY ARCS ARE ALLOWED (approved: true when the arc is clear):
- Stories that mention hardship (illness, disaster, loss) but end in recovery, rescue, rebuilding, survival, or community help — e.g. "cancer survivor", "rebuilt after the flood", "lost everything, then…".
- The test is narrative arc: did the story end better than it started?

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
// More mainstream feeds → more keyword survivors needing LLM time.
const LLM_TIME_BUDGET_MS = 15 * 60 * 1000; // 15 minutes, leaves headroom under typical job timeout
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
  { url: "https://theindependent.sg/feed/",                                                      name: "The Independent SG",   region: "singapore" },
  { url: "https://www.todayonline.com/feed",                                                     name: "TODAY Online",         region: "singapore" },
  // CNA Lifestyle / human-interest leaning feed (when available)
  { url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=6514",  name: "CNA Lifestyle",        region: "singapore" },

  // ── Malaysia ───────────────────────────────────────────────────
  { url: "https://www.freemalaysiatoday.com/feed/",                                              name: "Free Malaysia Today",  region: "asia" },

  // ── Indonesia ──────────────────────────────────────────────────
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

  // ── Global mainstream news (strict keyword + LLM — NOT isPositiveFeed)
  // Mostly neutral/negative wire; only rare genuine uplift should survive (threshold 3+).
  { url: "http://feeds.bbci.co.uk/news/world/rss.xml",                                           name: "BBC World",            region: "world" },
  { url: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",                         name: "BBC Science",          region: "world" },
  { url: "http://feeds.bbci.co.uk/news/health/rss.xml",                                          name: "BBC Health",           region: "world" },
  { url: "http://feeds.bbci.co.uk/news/technology/rss.xml",                                      name: "BBC Technology",       region: "world" },
  { url: "http://rss.cnn.com/rss/edition.rss",                                                   name: "CNN Top",              region: "world" },
  { url: "http://rss.cnn.com/rss/edition_world.rss",                                             name: "CNN World",            region: "world" },
  { url: "https://www.theguardian.com/world/rss",                                                name: "Guardian World",       region: "world" },
  { url: "https://www.theguardian.com/environment/rss",                                          name: "Guardian Environment", region: "world" },
  { url: "https://www.theguardian.com/science/rss",                                              name: "Guardian Science",     region: "world" },
  { url: "https://www.theguardian.com/society/rss",                                              name: "Guardian Society",     region: "world" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml",                               name: "NYT World",            region: "world" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml",                             name: "NYT Science",          region: "world" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Health.xml",                              name: "NYT Health",           region: "world" },
  { url: "https://feeds.npr.org/1001/rss.xml",                                                   name: "NPR News",             region: "world" },
  { url: "https://feeds.npr.org/1007/rss.xml",                                                   name: "NPR Science",          region: "world" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml",                                            name: "Al Jazeera",           region: "world" },
  { url: "https://www.france24.com/en/rss",                                                      name: "France 24",            region: "world" },
  { url: "https://www.euronews.com/rss",                                                         name: "Euronews",             region: "world" },
  // Bloomberg/CNBC public RSS is often blocked or unstable — skipped for now

  // ── Dedicated positive-news sources (already curated — lower threshold) ─
  { url: "https://www.goodnewsnetwork.org/feed/",                                                name: "Good News Network",    region: "world",     isPositiveFeed: true },
  { url: "https://www.positive.news/feed/",                                                      name: "Positive News",        region: "world",     isPositiveFeed: true },
  { url: "https://www.goodgoodgood.co/articles/rss.xml",                                         name: "Good Good Good",       region: "world",     isPositiveFeed: true },
  { url: "https://reasonstobecheerful.world/feed/",                                               name: "Reasons to be Cheerful", region: "world",   isPositiveFeed: true },
  { url: "https://www.optimistdaily.com/feed/",                                                   name: "Optimist Daily",       region: "world",     isPositiveFeed: true },
  { url: "https://tanksgoodnews.com/feed/",                                                        name: "Tank's Good News",     region: "world",     isPositiveFeed: true },
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
    let cleaned = url.trim()
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/^["']|["']$/g, "");
    if (cleaned.startsWith("//")) cleaned = "https:" + cleaned;
    if (!/^https?:\/\//i.test(cleaned)) return;
    // Skip tracking pixels / tiny placeholders / data URIs
    if (/1x1|pixel\.|spacer|blank\.gif|transparent|data:image/i.test(cleaned)) return;
    // Skip obvious non-images
    if (/\.(mp4|webm|mp3|pdf)(\?|$)/i.test(cleaned)) return;
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
  const blockReasons = [];

  // Negative word hits → soft-block (LLM decides), not hard kill
  for (const neg of NEGATIVE_FILTER_PATTERNS) {
    if (matchesWord(combined, neg)) {
      blockReasons.push(`neg:${neg}`);
      if (blockReasons.length >= 8) break;
    }
  }

  // Phrase-level negatives
  const extraNegative = [
    "sex charge", "sex offence", "sentenced to", "faces charges",
    "charged with", "accused of", "under investigation",
    "crackdown", "controversial", "backlash", "fury", "outrage",
    "surge in price", "price surge", "bear market", "recession fear",
    "out of the championship", "knocked out", "eliminated from",
    "crash out", "crashes out", "coe price", "coe premiums",
    "war crime", "military strike", "airstrike", "drone attack",
    "lawsuit", "guilty verdict", "death penalty",
  ];
  for (const neg of extraNegative) {
    if (combined.includes(neg)) {
      blockReasons.push(`extra:${neg}`);
      if (blockReasons.length >= 12) break;
    }
  }

  if (title.length < 20) {
    return { hardReject: true, reasons: ["short_title"], score: 0, category: "humanity" };
  }

  // Score each category (positive keywords)
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

  const threshold = isPositiveFeed ? 2 : 3;

  // Soft-block: has negative tokens — send to LLM (recovery arcs)
  if (blockReasons.length > 0) {
    return {
      softBlock: true,
      reasons: blockReasons.slice(0, 6),
      score: Math.max(bestScore, 1),
      category: bestCategory,
    };
  }

  // Hard reject: no positive signal
  if (bestScore < threshold) {
    return {
      hardReject: true,
      reasons: [`low_score:${bestScore}`],
      score: bestScore,
      category: bestCategory,
    };
  }

  return { score: bestScore, category: bestCategory, softBlock: false, hardReject: false, reasons: [] };
}

// ════════════════════════════════════════════════════════════════════
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
// DEDUP — aggressive title normalization so curly quotes, &amp; vs &,
// dashes, and punctuation don't create duplicate stories.
// ═══════════════════════════════════════════════════════════════════
function normalizeTitle(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    // Smart quotes / dashes / ellipsis
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/\u2026/g, "...")
    // Strip all non-alphanumeric → spaces, collapse
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function makeId(title) {
  return createHash("md5").update(normalizeTitle(title)).digest("hex").slice(0, 12);
}

/** Prefer the stronger of two near-duplicate articles */
function preferArticle(a, b) {
  const rank = (x) =>
    (x.llmVerified ? 10000 : 0) +
    (typeof x.llmScore === "number" ? x.llmScore * 100 : 0) +
    (x.score || 0) * 10 +
    (x.imageUrl ? 50 : 0) +
    (x.region === "singapore" ? 20 : 0) +
    new Date(x.pubDate || 0).getTime() / 1e13;
  return rank(a) >= rank(b) ? a : b;
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

function appendRejectLog(newEntries) {
  if (!newEntries.length) return;
  let prev = [];
  try {
    if (existsSync(REJECT_LOG_PATH)) {
      const parsed = JSON.parse(readFileSync(REJECT_LOG_PATH, "utf-8"));
      prev = Array.isArray(parsed.entries) ? parsed.entries : [];
    }
  } catch { /* start fresh */ }
  const cutoff = Date.now() - REJECT_LOG_RETENTION_MS;
  const merged = [...newEntries, ...prev]
    .filter((e) => e && e.ts && new Date(e.ts).getTime() >= cutoff)
    .slice(0, 8000);

  const byStage = {};
  const byReason = {};
  for (const e of merged) {
    byStage[e.stage] = (byStage[e.stage] || 0) + 1;
    for (const r of e.reasons || []) {
      const key = String(r).split(":")[0];
      byReason[key] = (byReason[key] || 0) + 1;
    }
  }
  const topReasons = Object.entries(byReason)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([reason, count]) => ({ reason, count }));

  writeFileSync(
    REJECT_LOG_PATH,
    JSON.stringify(
      {
        lastUpdated: new Date().toISOString(),
        retentionDays: 7,
        entryCount: merged.length,
        byStage,
        topReasonPrefixes: topReasons,
        entries: merged,
      },
      null,
      2
    )
  );
  console.log(`\n📋 Reject log: ${newEntries.length} new, ${merged.length} retained (7-day window) → public/reject-log.json`);
}

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
  const rejectLog = [];
  const seenKeys = new Set(); // normalized titles already kept

  // Load existing feed to merge & dedup
  let existing = [];
  if (existsSync(OUTPUT_PATH)) {
    try {
      const raw = readFileSync(OUTPUT_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      existing = parsed.articles || [];
      for (const a of existing) seenKeys.add(normalizeTitle(a.title));
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

        const titleKey = normalizeTitle(title);
        if (!titleKey || seenKeys.has(titleKey)) continue;
        seenKeys.add(titleKey);
        const id = makeId(title);

        const summary = makeSummary(item);

        // Skip items with no usable summary — a bare headline with a blank
        // body reads badly on a card and we can't verify positivity of the
        // full story from the title alone.
        if (!summary || summary.length < 20) continue;

        const scoring = scoreArticle(title, summary, feed.isPositiveFeed === true);
        if (!scoring || scoring.hardReject) {
          rejectLog.push({
            ts: new Date().toISOString(),
            title: title.slice(0, 160),
            source: feed.name,
            stage: "keyword_hard",
            reasons: (scoring && scoring.reasons) || ["null_score"],
          });
          continue;
        }

        // Second-pass LLM. Soft-blocked items (negative keywords) MUST go
        // through the LLM — recovery arcs should not die on a single token.
        // Clean keyword survivors still get an LLM check when budget allows.
        let llmVerified = false;
        let llmScore = null;
        let llmReason = "";
        let llmModel = null;

        const needsLlm = scoring.softBlock === true || !!OPENROUTER_API_KEY;
        if (scoring.softBlock && !OPENROUTER_API_KEY) {
          // Cannot rescue recovery arcs without a model — log and skip
          rejectLog.push({
            ts: new Date().toISOString(),
            title: title.slice(0, 160),
            source: feed.name,
            stage: "soft_block_no_llm_key",
            reasons: scoring.reasons || [],
          });
          continue;
        }

        if (needsLlm || scoring.softBlock) {
          const verdict = await classifyWithLLM(title, summary);
          if (verdict) {
            if (!verdict.approved || (verdict.score && verdict.score < 7)) {
              console.log(
                `   ✗ LLM rejected${scoring.softBlock ? " (soft-block)" : ""}: "${title.slice(0, 55)}…" (score=${verdict.score ?? "n/a"}, ${verdict.reason})`
              );
              rejectLog.push({
                ts: new Date().toISOString(),
                title: title.slice(0, 160),
                source: feed.name,
                stage: scoring.softBlock ? "soft_block_llm_reject" : "llm_reject",
                reasons: [
                  ...(scoring.reasons || []),
                  `llm_score:${verdict.score ?? "n/a"}`,
                  `llm:${(verdict.reason || "").slice(0, 120)}`,
                ],
              });
              continue;
            }
            llmVerified = true;
            llmScore = verdict.score;
            llmReason = verdict.reason;
            llmModel = verdict.model;
            if (scoring.softBlock) {
              console.log(
                `   ✓ LLM rescued soft-block: "${title.slice(0, 55)}…" (score=${verdict.score}, ${verdict.reason})`
              );
            }
          } else if (scoring.softBlock) {
            // Budget exhausted or all models failed — do not publish soft-blocks without LLM
            rejectLog.push({
              ts: new Date().toISOString(),
              title: title.slice(0, 160),
              source: feed.name,
              stage: "soft_block_llm_unavailable",
              reasons: scoring.reasons || [],
            });
            continue;
          }
          // Non-soft-block + no verdict: fall through and keep keyword-only article
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

  // Merge with existing, dedup by normalized title (not fragile raw id),
  // sort by date, cap at 500
  const merged = [...allArticles, ...existing];
  const dedupMap = new Map();
  for (const a of merged) {
    const key = normalizeTitle(a.title);
    if (!key) continue;
    // Re-stamp id so older crooked ids converge
    const stamped = { ...a, id: makeId(a.title) };
    if (!dedupMap.has(key)) {
      dedupMap.set(key, stamped);
    } else {
      dedupMap.set(key, preferArticle(stamped, dedupMap.get(key)));
    }
  }

  const final = Array.from(dedupMap.values())
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 500);

  console.log(`🧹 Deduped to ${final.length} unique stories (from ${merged.length} raw)`);

  // Persist reject reasons for 7 days (false-negative / soft-block analysis)
  appendRejectLog(rejectLog);

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
