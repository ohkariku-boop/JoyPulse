"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Sun, Heart, Sparkles, Cpu, Globe, Trophy, Music, Search,
  X, ArrowRight, Compass, Gift, ExternalLink, MapPin,
  Clock, Briefcase, Bookmark, BookmarkCheck, ChevronDown,
  ChevronLeft, ChevronRight, Star, TrendingUp, Moon, Link2,
} from "lucide-react";

const SUPPORT_EMAIL = "joypulse.support@proton.me";

/* Brand logos for share buttons (inline SVG — no external icon CDN) */
function IconWhatsApp({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
function IconTelegram({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}
function IconX({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function IconFacebook({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* TYPES                                                          */
/* ═══════════════════════════════════════════════════════════════ */
interface FeedArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl: string | null;
  category: string;
  score: number;
  llmVerified?: boolean;
  llmScore?: number | null;
  region: string;
  location: string;
  imageUrl: string | null;
  pubDate: string;
}

export interface ClientPageProps {
  articles: FeedArticle[];
  lastUpdated: string;
}

/* ═══════════════════════════════════════════════════════════════ */
/* DAILY QUOTE — rotates once per day, same for everyone that day,  */
/* no backend needed. Original lines only (not attributed to real   */
/* people) to keep this copyright-safe.                             */
/* ═══════════════════════════════════════════════════════════════ */
const DAILY_QUOTES: { text: string; author: string }[] = [
  { text: "Right now across Asia, a teacher is changing a life, a forest is being replanted, and a stranger is helping another stranger. Focus on the good.", author: "JoyPulse" },
  { text: "Kindness doesn't make the headlines, but it's happening in a thousand quiet places from Singapore to Seoul today.", author: "JoyPulse" },
  { text: "Somewhere nearby, a stranger just helped another stranger for no reason at all. That's the world too.", author: "JoyPulse" },
  { text: "Good news doesn't shout. It just keeps happening, one small act at a time.", author: "JoyPulse" },
  { text: "Every day, more gets fixed, healed, planted, and shared across Asia than the headlines ever show.", author: "JoyPulse" },
  { text: "A child learned something new today. Somewhere else, someone finally got the help they needed. Both are real.", author: "JoyPulse" },
  { text: "The world is quietly kinder than the news makes it look.", author: "JoyPulse" },
  { text: "One good deed doesn't need an audience to matter.", author: "JoyPulse" },
  { text: "Progress rarely trends, but it never really stops either.", author: "JoyPulse" },
  { text: "Somewhere today in Asia, a community rebuilt something together that felt impossible alone.", author: "JoyPulse" },
  { text: "The good stuff is happening at the same speed as everything else — it's just quieter.", author: "JoyPulse" },
  { text: "Hope isn't naive. It's just paying attention to a different set of facts.", author: "JoyPulse" },
  { text: "Somebody's small act of patience today will ripple further than they'll ever know.", author: "JoyPulse" },
  { text: "There is always, somewhere, a reason to smile today — the trick is just looking for it.", author: "JoyPulse" },
  { text: "The news cycle moves fast. Genuine goodness moves quietly, and it's still winning.", author: "JoyPulse" },
];

function getDailyQuote(): { text: string; author: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diffMs = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diffMs / 86400000);
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}

/* ═══════════════════════════════════════════════════════════════ */
/* HELPERS                                                         */
/* ═══════════════════════════════════════════════════════════════ */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const CATEGORY_META: Record<string, { icon: typeof Sun; label: string; pillColor: string; textColor: string }> = {
  all:      { icon: Sun,       label: "All Stories",   pillColor: "bg-amber-50 text-amber-700 border-amber-200",      textColor: "text-amber-600"   },
  humanity: { icon: Heart,     label: "Humanity",      pillColor: "bg-rose-50 text-rose-700 border-rose-200",         textColor: "text-rose-600"    },
  science:  { icon: Cpu,       label: "Science & Tech", pillColor: "bg-blue-50 text-blue-700 border-blue-200",        textColor: "text-blue-600"    },
  nature:   { icon: Globe,     label: "Nature",        pillColor: "bg-emerald-50 text-emerald-700 border-emerald-200", textColor: "text-emerald-600" },
  sports:   { icon: Trophy,    label: "Sports",        pillColor: "bg-purple-50 text-purple-700 border-purple-200",   textColor: "text-purple-600"  },
  arts:     { icon: Music,     label: "Arts & Culture", pillColor: "bg-pink-50 text-pink-700 border-pink-200",        textColor: "text-pink-600"    },
  business: { icon: Briefcase, label: "Business",      pillColor: "bg-teal-50 text-teal-700 border-teal-200",         textColor: "text-teal-600"    },
};

const REGION_TABS = [
  { id: "all",       label: "🌏 All Regions" },
  { id: "singapore", label: "🇸🇬 Singapore"   },
  { id: "asia",      label: "🌏 Asia"         },
  { id: "world",     label: "🌍 World"        },
];

const REACTION_TYPES = [
  { key: "happy",     emoji: "😄", label: "Happy"     },
  { key: "heart",     emoji: "❤️",  label: "Love It"   },
  { key: "celebrate", emoji: "🎉", label: "Celebrate" },
  { key: "mindblown", emoji: "🤯", label: "Awe"       },
] as const;

type ReactionKey = typeof REACTION_TYPES[number]["key"];

/* LocalStorage helpers */
function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function lsSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
}

/**
 * Stock photos — category is the hard boundary so a nature story never
 * gets a tech image. Within a category we refine with specific keywords.
 * Only distinctive word-boundary keywords (no short false-positive stems).
 * All Unsplash IDs are stable, well-known assets.
 */
const U = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&q=80&w=800`;

/** Always-safe fallback if even stock fails to load */
const SAFE_FALLBACK = U("photo-1470071459604-3b5ec3a7fe05");

type ThemeRule = { cat: string; keys: RegExp; images: string[] };

const THEME_RULES: ThemeRule[] = [
  // sports
  { cat: "sports", keys: /\b(football|soccer|fifa|premier league|world cup)\b/i,
    images: [U("photo-1574629810360-7efbbe195018"), U("photo-1431324155629-1a6deb1dec8d")] },
  { cat: "sports", keys: /\b(basketball|nba)\b/i,
    images: [U("photo-1546519638-68e109498ffc"), U("photo-1519861531473-9200262188bf")] },
  { cat: "sports", keys: /\b(tennis|wimbledon)\b/i,
    images: [U("photo-1554068865-24cecd4e34b8")] },
  { cat: "sports", keys: /\b(swimming|swimmer)\b/i,
    images: [U("photo-1530549387789-4c1017266635")] },
  { cat: "sports", keys: /\b(marathon|athletics|sprinter)\b/i,
    images: [U("photo-1461896836934-ffe607ba6851"), U("photo-1552674605-db6ffd4facb5")] },
  { cat: "sports", keys: /\b(cycling|bicycle|cyclist)\b/i,
    images: [U("photo-1517649763962-0c623066013b")] },

  // arts
  { cat: "arts", keys: /\b(music|concert|orchestra|piano|guitar|singer|choir)\b/i,
    images: [U("photo-1493225457124-a3eb161ffa5f"), U("photo-1514320291840-2e0a9bf2a9ae")] },
  { cat: "arts", keys: /\b(painting|painter|gallery|museum|exhibition)\b/i,
    images: [U("photo-1460661411762-d0c4c8e0b1a5"), U("photo-1513364776144-60967b0f800f")] },
  { cat: "arts", keys: /\b(dance|ballet|dancer)\b/i,
    images: [U("photo-1518834107812-67b0b7c58434")] },
  { cat: "arts", keys: /\b(cinema|movie|theatre|theater|film festival)\b/i,
    images: [U("photo-1485846234645-a62644f84728")] },
  { cat: "arts", keys: /\b(library|literature|novelist)\b/i,
    images: [U("photo-1481627834876-b7833e8f5570")] },

  // science
  { cat: "science", keys: /\b(technology|software|startup|artificial intelligence|robot|semiconductor|chipmaker)\b|\bai\b/i,
    images: [U("photo-1518770660439-4636190af475"), U("photo-1451187580459-43490279c0fa")] },
  { cat: "science", keys: /\b(hospital|doctor|nurse|surgery|vaccine|medical)\b/i,
    images: [U("photo-1576086213369-97a306d36557"), U("photo-1579684385127-1ef15d508118")] },
  { cat: "science", keys: /\b(space|nasa|astronaut|satellite|rocket)\b/i,
    images: [U("photo-1446776811953-b23d57bd21aa")] },
  { cat: "science", keys: /\b(laboratory|scientist|chemistry)\b/i,
    images: [U("photo-1532094349884-543bc11b234d")] },

  // nature
  { cat: "nature", keys: /\b(whale|dolphin|ocean|marine|coral|underwater)\b/i,
    images: [U("photo-1475924156734-496f6cac6ec1"), U("photo-1544551763-46a013bb70d5")] },
  { cat: "nature", keys: /\b(forest|rainforest|woodland|replant|tree planting)\b/i,
    images: [U("photo-1441974231531-c6227db76b6e"), U("photo-1511497584788-876760111969")] },
  { cat: "nature", keys: /\b(dog|puppy|canine)\b/i,
    images: [U("photo-1587300003388-59208cc962cb")] },
  { cat: "nature", keys: /\b(cat|kitten|feline)\b/i,
    images: [U("photo-1514888286974-6c03e2ca1dba")] },
  { cat: "nature", keys: /\b(bird|eagle|wildlife|animal rescue)\b/i,
    images: [U("photo-1444464666168-49d633b86797")] },
  { cat: "nature", keys: /\b(garden|farming|agriculture|crop)\b/i,
    images: [U("photo-1542601906990-b4d3fb778b09")] },

  // humanity
  { cat: "humanity", keys: /\b(school|student|teacher|classroom|education)\b/i,
    images: [U("photo-1503676260728-1c00da094a0b")] },
  { cat: "humanity", keys: /\b(food bank|hunger|hawker|soup kitchen)\b/i,
    images: [U("photo-1488521787991-ed7bbaae773c"), U("photo-1504674900247-0877df9cc836")] },
  { cat: "humanity", keys: /\b(volunteer|charity|donation|kindness)\b/i,
    images: [U("photo-1469570066476-fd757c8d3d95"), U("photo-1559027615-cd4628902d4a")] },
  { cat: "humanity", keys: /\b(children|childhood)\b/i,
    images: [U("photo-1503454537195-1dcabb73ffb9")] },
];

const CATEGORY_STOCK: Record<string, string[]> = {
  humanity: [
    U("photo-1469570066476-fd757c8d3d95"),
    U("photo-1529156069898-49953e39b3ac"),
    U("photo-1559027615-cd4628902d4a"),
  ],
  science: [
    U("photo-1532094349884-543bc11b234d"),
    U("photo-1518770660439-4636190af475"),
    U("photo-1576086213369-97a306d36557"),
  ],
  nature: [
    U("photo-1441974231531-c6227db76b6e"),
    U("photo-1506905925346-21bda4d32df4"),
    U("photo-1475924156734-496f6cac6ec1"),
  ],
  sports: [
    U("photo-1461896836934-ffe607ba6851"),
    U("photo-1574629810360-7efbbe195018"),
    U("photo-1552674605-db6ffd4facb5"),
  ],
  arts: [
    U("photo-1513364776144-60967b0f800f"),
    U("photo-1493225457124-a3eb161ffa5f"),
    U("photo-1460661411762-d0c4c8e0b1a5"),
  ],
  all: [
    U("photo-1499209974431-9dddcece7f88"),
    U("photo-1529156069898-49953e39b3ac"),
    U("photo-1470071459604-3b5ec3a7fe05"),
  ],
};

function pickFrom(pool: string[], id: string): string {
  if (!pool.length) return SAFE_FALLBACK;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return pool[Math.abs(hash) % pool.length];
}

function stockFor(id: string, category?: string, title?: string, summary?: string): string {
  const text = `${title || ""} ${summary || ""}`;
  const cat = (category && CATEGORY_STOCK[category] ? category : "all");

  // Theme match ONLY within this story's category (or if category is "all").
  // Prevents nature stories matching tech keywords and vice versa.
  for (const rule of THEME_RULES) {
    if (rule.cat !== cat && cat !== "all") continue;
    if (rule.keys.test(text)) {
      return pickFrom(rule.images, id);
    }
  }

  return pickFrom(CATEGORY_STOCK[cat] || CATEGORY_STOCK.all, id);
}

/** Decode common HTML entities and trim junk from RSS image URLs */
function cleanImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  let u = url.trim()
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/^["']|["']$/g, "");
  if (u.startsWith("//")) u = "https:" + u;
  if (!/^https?:\/\//i.test(u)) return null;
  if (/1x1|pixel\.|spacer|blank\.gif|transparent\.|data:image\/svg/i.test(u)) return null;
  return u;
}

/**
 * Bulletproof story image.
 * - Starts with RSS image if present, otherwise category stock
 * - onError swaps src in-place (no React state race) → stock → SAFE_FALLBACK
 * - Parent containers keep a slate background so the area never looks empty
 */
function StoryImage({
  imageUrl,
  category,
  id = "",
  title = "",
  summary = "",
  className = "",
  alt = "",
}: {
  imageUrl: string | null;
  category?: string;
  id?: string;
  title?: string;
  summary?: string;
  className?: string;
  alt?: string;
}) {
  const stock = stockFor(id || "fallback", category, title, summary);
  const cleaned = cleanImageUrl(imageUrl);
  // Prefer stock over flaky publisher CDNs when URL looks incomplete / suspicious
  const preferStock =
    !cleaned ||
    cleaned.length < 40 ||
    !/\.(jpe?g|png|webp|gif)(\?|$)/i.test(cleaned.split("?")[0]);

  const initialSrc = preferStock ? stock : (cleaned as string);

  return (
    <img
      key={id || initialSrc}
      src={initialSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      data-stock={stock}
      data-safe={SAFE_FALLBACK}
      data-step={preferStock ? "1" : "0"}
      onError={(e) => {
        const el = e.currentTarget;
        const step = el.dataset.step || "0";
        if (step === "0") {
          el.dataset.step = "1";
          el.src = el.dataset.stock || SAFE_FALLBACK;
        } else if (step === "1") {
          el.dataset.step = "2";
          el.src = el.dataset.safe || SAFE_FALLBACK;
        }
        // step 2+: stop — avoid infinite loop
      }}
    />
  );
}

/** Horizontal story rail with left/right arrow buttons (more discoverable than a thin scrollbar). */
function StoryRail({
  children,
  darkMode,
}: {
  children: React.ReactNode;
  darkMode: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
    };
  }, [update, children]);

  const scrollBy = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(280, el.clientWidth * 0.8), behavior: "smooth" });
  };

  const btnClass = `absolute top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full shadow-md border flex items-center justify-center transition disabled:opacity-0 disabled:pointer-events-none ${
    darkMode
      ? "bg-slate-800/95 border-slate-600 text-slate-200 hover:bg-slate-700"
      : "bg-white/95 border-slate-200 text-slate-700 hover:bg-slate-50"
  }`;

  return (
    <div className="relative group/rail">
      <button
        type="button"
        aria-label="Scroll left"
        disabled={!canLeft}
        onClick={() => scrollBy(-1)}
        className={`${btnClass} left-0 sm:-left-1`}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        disabled={!canRight}
        onClick={() => scrollBy(1)}
        className={`${btnClass} right-0 sm:-right-1`}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto no-scrollbar pb-1 scroll-smooth px-1"
      >
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* MAIN COMPONENT                                                  */
/* ═══════════════════════════════════════════════════════════════ */
export default function ClientPage({ articles, lastUpdated }: ClientPageProps) {
  /* ── state ─────────────────────────────────────────────────── */
  const [selectedRegion, setSelectedRegion]     = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery]           = useState("");
  const [sortBy, setSortBy]                     = useState<"new" | "popular">("new");
  const [showCount, setShowCount]               = useState(12);
  const [showSavedShelf, setShowSavedShelf]     = useState(false);

  // per-article localStorage reactions  { [articleId]: { happy: n, … } }
  const [myReactions, setMyReactions] = useState<Record<string, Record<ReactionKey, number>>>({});
  // bookmarks
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  // detail modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  // floating emojis
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  // toast
  const [toast, setToast] = useState<string | null>(null);
  // dark mode
  const [darkMode, setDarkMode] = useState(false);
  // mobile search expand
  const [searchOpen, setSearchOpen] = useState(false);
  // newsletter
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "ok" | "error" | "loading">("idle");

  /* ── hydrate from localStorage ─────────────────────────────── */
  useEffect(() => {
    setMyReactions(lsGet("jp_reactions", {}));
    const bk: string[] = lsGet("jp_bookmarks", []);
    setBookmarks(new Set(bk));
    const savedDark = lsGet<boolean | null>("jp_dark", null);
    if (savedDark !== null) setDarkMode(savedDark);
    else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) setDarkMode(true);
  }, []);

  /* ── persist ───────────────────────────────────────────────── */
  useEffect(() => { lsSet("jp_reactions", myReactions); }, [myReactions]);
  useEffect(() => { lsSet("jp_bookmarks", Array.from(bookmarks)); }, [bookmarks]);
  useEffect(() => { lsSet("jp_dark", darkMode); }, [darkMode]);

  /* ── helpers ───────────────────────────────────────────────── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  const sharePayload = useCallback((article: FeedArticle) => {
    const url =
      article.sourceUrl ||
      (typeof window !== "undefined" ? window.location.href : "https://ohkariku-boop.github.io/JoyPulse/");
    const text = `${article.title}\n\n✨ Found on JoyPulse — Asia's good news\n`;
    return { url, text, title: article.title };
  }, []);

  /** Native share sheet when available; otherwise copy link */
  const shareStory = useCallback(
    async (article: FeedArticle) => {
      const { url, text, title } = sharePayload(article);
      try {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title, text, url });
          showToast("Shared! ✨");
          return;
        }
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(`${text}${url}`);
          showToast("Link copied — paste anywhere!");
          return;
        }
        showToast("Copy this link: " + url);
      } catch {
        /* user cancelled */
      }
    },
    [sharePayload, showToast]
  );

  const shareTo = useCallback(
    async (article: FeedArticle, channel: "whatsapp" | "telegram" | "x" | "facebook" | "copy") => {
      const { url, text, title } = sharePayload(article);
      const encodedUrl = encodeURIComponent(url);
      const encodedText = encodeURIComponent(text + url);
      const encodedTitle = encodeURIComponent(title);
      try {
        if (channel === "copy") {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(`${text}${url}`);
            showToast("Link copied!");
          } else {
            showToast(url);
          }
          return;
        }
        const href =
          channel === "whatsapp"
            ? `https://wa.me/?text=${encodedText}`
            : channel === "telegram"
              ? `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`
              : channel === "x"
                ? `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
                : `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
      } catch {
        showToast("Couldn’t open share — try copy link");
      }
    },
    [sharePayload, showToast]
  );

  const handleNewsletter = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || !trimmed.includes(".")) {
      setEmailStatus("error");
      showToast("Please enter a valid email");
      return;
    }
    setEmailStatus("loading");

    // Prefer real provider endpoints (set at build time via GitHub Actions secrets).
    // FORMSPREE_ID → Formspree form. NEWSLETTER_EMAIL → FormSubmit.co notify inbox.
    // BUTTONDOWN_USER → Buttondown list.
    const formspreeId = process.env.NEXT_PUBLIC_FORMSPREE_ID || "";
    const notifyEmail = process.env.NEXT_PUBLIC_NEWSLETTER_EMAIL || "";
    const buttondownUser = process.env.NEXT_PUBLIC_BUTTONDOWN_USER || "";

    try {
      let sent = false;

      if (formspreeId) {
        const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email: trimmed, source: "JoyPulse", _subject: "JoyPulse newsletter signup" }),
        });
        if (!res.ok) throw new Error("Formspree error");
        sent = true;
      } else if (buttondownUser) {
        const res = await fetch(`https://buttondown.email/api/emails/embed-subscribe/${buttondownUser}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ email: trimmed }),
        });
        if (!res.ok && res.status !== 204) throw new Error("Buttondown error");
        sent = true;
      } else if (notifyEmail) {
        const res = await fetch(`https://formsubmit.co/ajax/${notifyEmail}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ email: trimmed, _subject: "JoyPulse newsletter signup", message: `${trimmed} joined the JoyPulse digest` }),
        });
        if (!res.ok) throw new Error("FormSubmit error");
        sent = true;
      }

      // Always keep a local backup list (useful before a provider is configured)
      const list: string[] = lsGet("jp_newsletter_emails", []);
      if (!list.includes(trimmed)) {
        list.push(trimmed);
        lsSet("jp_newsletter_emails", list);
      }

      setEmailStatus("ok");
      setEmail("");
      showToast(sent ? "You're in! Watch your inbox for good news ☀️" : "You're on the list! Digest coming soon ☀️");
    } catch {
      setEmailStatus("error");
      showToast("Couldn't subscribe right now — please try again");
    }
  }, [email, showToast]);

  const triggerFloat = useCallback((cx: number, cy: number, emoji: string) => {
    const fid = Date.now() + Math.random();
    setFloats((p) => [...p, { id: fid, x: cx - 15, y: cy - 30, emoji }]);
    setTimeout(() => setFloats((p) => p.filter((f) => f.id !== fid)), 1400);
  }, []);

  const addReaction = useCallback((articleId: string, key: ReactionKey, e: React.MouseEvent) => {
    triggerFloat(e.clientX, e.clientY, REACTION_TYPES.find((r) => r.key === key)!.emoji);
    setMyReactions((prev) => {
      const old = prev[articleId] || { happy: 0, heart: 0, celebrate: 0, mindblown: 0 };
      return { ...prev, [articleId]: { ...old, [key]: old[key] + 1 } };
    });
  }, [triggerFloat]);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); showToast("Removed from saved"); }
      else { next.add(id); showToast("Saved for later! 📌"); }
      return next;
    });
  }, [showToast]);

  const totalMyReactions = useMemo(() => {
    let t = 0;
    for (const v of Object.values(myReactions)) t += v.happy + v.heart + v.celebrate + v.mindblown;
    return t;
  }, [myReactions]);

  const dailyQuote = useMemo(() => getDailyQuote(), []);

  /* ── filtering & sorting ───────────────────────────────────── */
  const filtered = useMemo(() => {
    let list = articles;
    // Client-side safety net: collapse near-duplicate titles (quotes/entities)
    const seen = new Set<string>();
    list = list.filter((a) => {
      const key = a.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (selectedRegion !== "all") list = list.filter((a) => a.region === selectedRegion);
    if (selectedCategory !== "all") list = list.filter((a) => a.category === selectedCategory);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => `${a.title} ${a.summary} ${a.location} ${a.source}`.toLowerCase().includes(q));
    }
    if (sortBy === "popular") {
      list = [...list].sort((a, b) => b.score - a.score);
    }
    // default is "new" — already sorted by pubDate from feed.json
    return list;
  }, [articles, selectedRegion, selectedCategory, searchQuery, sortBy]);

  const visible = filtered.slice(0, showCount);
  const selectedArticle = selectedId ? articles.find((a) => a.id === selectedId) || null : null;
  const modalRef = React.useRef<HTMLDivElement>(null);
  const closeModalBtnRef = React.useRef<HTMLButtonElement>(null);

  // Modal: Escape to close, focus close button, lock body scroll
  useEffect(() => {
    if (!selectedArticle) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the close control for keyboard users
    closeModalBtnRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setSelectedId(null);
        return;
      }
      // Simple focus trap inside modal
      if (e.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedArticle]);

  /* ── Today's Top Story / Best of the Week / Joy Meter ─────────
     Combined score: LLM-verified stories rank far above keyword-only
     ones (they've had a real contextual check, not just pattern
     matching), keyword score is the tiebreaker within each tier. */
  // Ranking: LLM-verified > Singapore > Asia > has image > keyword score
  const combinedScore = useCallback((a: FeedArticle) => {
    const llmBoost = a.llmVerified ? 1000 + (a.llmScore ?? 7) * 10 : 0;
    const regionBoost =
      a.region === "singapore" ? 120 : a.region === "asia" ? 60 : 0;
    const imageBoost = a.imageUrl ? 40 : 0;
    return llmBoost + regionBoost + imageBoost + a.score;
  }, []);

  /**
   * Recent pool for "today" sections.
   * Uses a rolling 48h window from the newest article (UTC ms), NOT calendar
   * day strings — those break across timezones (build=UTC, readers=SGT) and
   * can leave only 1–2 stories or an empty section after hydration.
   */
  const todaysArticles = useMemo(() => {
    if (articles.length === 0) return [];
    const newest = new Date(articles[0].pubDate).getTime();
    if (!Number.isFinite(newest)) return articles.slice(0, 30);
    const windowStart = newest - 48 * 3600 * 1000;
    const recent = articles.filter((a) => {
      const t = new Date(a.pubDate).getTime();
      return Number.isFinite(t) && t >= windowStart;
    });
    // Always keep enough candidates for Today's 3 + top story
    return recent.length >= 3 ? recent : articles.slice(0, 30);
  }, [articles]);

  const titleKey = useCallback(
    (s: string) => s.toLowerCase().replace(/&amp;/g, "&").replace(/[^a-z0-9]+/g, " ").trim(),
    []
  );

  /**
   * Top story: hard prefer real images; SG/Asia first.
   * StoryImage still provides stock if no RSS image — but we try hard for real photos.
   */
  const topStory = useMemo(() => {
    const pool = todaysArticles.length > 0 ? todaysArticles : articles;
    if (pool.length === 0) return null;
    const ranked = [...pool].sort((a, b) => {
      const score = (x: FeedArticle) =>
        combinedScore(x) +
        (x.imageUrl ? 500 : 0) +
        (x.region === "singapore" ? 150 : x.region === "asia" ? 80 : 0);
      const diff = score(b) - score(a);
      return diff !== 0 ? diff : new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
    });
    // Prefer any candidate with imageUrl; else best overall (stock will show)
    return ranked.find((a) => a.imageUrl) || ranked[0];
  }, [todaysArticles, articles, combinedScore]);

  /**
   * Today's 3:
   * - Never repeats top story
   * - Prefer real images (StoryImage always fills stock as fallback)
   * - Guarantee 1 Singapore slot when SG stories exist
   * - Fill remaining with Asia-first ranking
   */
  const todaysThree = useMemo(() => {
    const pools = [todaysArticles, articles].filter((p) => p.length > 0);
    const seen = new Set<string>();
    if (topStory) seen.add(titleKey(topStory.title));

    const rank = (x: FeedArticle) =>
      combinedScore(x) +
      (x.imageUrl ? 300 : 0) +
      (x.region === "singapore" ? 100 : x.region === "asia" ? 50 : 0);

    const eligible = (pool: FeedArticle[]) =>
      [...pool]
        .filter((a) => a.id !== topStory?.id)
        .filter((a) => {
          const key = titleKey(a.title);
          if (!key || seen.has(key)) return false;
          return true;
        })
        .sort((a, b) => rank(b) - rank(a));

    const result: FeedArticle[] = [];
    const take = (a: FeedArticle) => {
      const key = titleKey(a.title);
      if (seen.has(key) || result.some((r) => r.id === a.id)) return false;
      seen.add(key);
      result.push(a);
      return true;
    };

    // 1) Singapore guarantee — prefer SG with image
    for (const pool of pools) {
      if (result.length >= 1) break;
      const sg = eligible(pool).filter((a) => a.region === "singapore");
      const sgImg = sg.find((a) => a.imageUrl) || sg[0];
      if (sgImg) take(sgImg);
    }

    // 2) Fill to 3 — prefer image + Asia
    for (const pool of pools) {
      for (const a of eligible(pool)) {
        if (result.length >= 3) break;
        take(a);
      }
      if (result.length >= 3) break;
    }

    return result.slice(0, 3);
  }, [todaysArticles, articles, topStory, combinedScore, titleKey]);

  /** Edition label from newest article date (Asia/Singapore friendly) */
  const editionLabel = useMemo(() => {
    const src = articles[0]?.pubDate || lastUpdated;
    if (!src) return "Daily edition";
    try {
      const d = new Date(src);
      return d.toLocaleDateString("en-SG", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "Asia/Singapore",
      }) + " edition";
    } catch {
      return "Daily edition";
    }
  }, [articles, lastUpdated]);

  const bestOfWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000;
    const seen = new Set<string>();
    for (const a of todaysThree) seen.add(titleKey(a.title));
    if (topStory) seen.add(titleKey(topStory.title));
    return [...articles]
      .filter((a) => new Date(a.pubDate).getTime() >= weekAgo && a.id !== topStory?.id)
      .sort((a, b) => combinedScore(b) - combinedScore(a))
      .filter((a) => {
        const key = titleKey(a.title);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8);
  }, [articles, topStory, todaysThree, combinedScore, titleKey]);

  // Singapore-only picks, excluding Today's 3 / top story / Best of the Week
  const singaporeSpotlight = useMemo(() => {
    const seen = new Set<string>();
    if (topStory) seen.add(titleKey(topStory.title));
    for (const a of todaysThree) seen.add(titleKey(a.title));
    for (const a of bestOfWeek) seen.add(titleKey(a.title));
    return [...articles]
      .filter((a) => a.region === "singapore" && a.id !== topStory?.id)
      .sort((a, b) => combinedScore(b) - combinedScore(a))
      .filter((a) => {
        const key = titleKey(a.title);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [articles, topStory, todaysThree, bestOfWeek, combinedScore, titleKey]);

  const joyMeter = useMemo(() => {
    const pool = todaysArticles.length >= 3 ? todaysArticles : articles.slice(0, 20);
    if (pool.length === 0) return { score: 0, label: "Warming Up", emoji: "🌱" };
    const countScore = Math.min(60, pool.length * 6);
    const verifiedRatio = pool.filter((a) => a.llmVerified).length / pool.length;
    const qualityScore = Math.min(40, verifiedRatio * 40);
    const score = Math.round(countScore + qualityScore);
    const label = score >= 85 ? "Radiating Joy" : score >= 65 ? "Feeling Bright" : score >= 40 ? "Gently Positive" : "Warming Up";
    const emoji = score >= 85 ? "🌟" : score >= 65 ? "☀️" : score >= 40 ? "🌤️" : "🌱";
    return { score, label, emoji };
  }, [todaysArticles, articles]);
  const availableCategories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category));
    return ["all", ...Object.keys(CATEGORY_META).filter((k) => k !== "all" && cats.has(k))];
  }, [articles]);

  /* ═════════════════════════════════════════════════════════════ */
  /* RENDER                                                        */
  /* ═════════════════════════════════════════════════════════════ */
  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 selection:bg-amber-100 selection:text-amber-900 ${darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-xs rounded-2xl bg-slate-900 p-3.5 text-white shadow-2xl border border-slate-700 animate-slide-up flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-900 text-sm">🎉</span>
          <span className="text-xs font-medium leading-snug">{toast}</span>
        </div>
      )}

      {/* Floating emojis */}
      {floats.map((f) => (
        <span key={f.id} className="fixed pointer-events-none z-50 text-3xl animate-float-up select-none" style={{ left: f.x, top: f.y }}>{f.emoji}</span>
      ))}

      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-amber-500 focus:text-slate-900 focus:px-3 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold"
      >
        Skip to stories
      </a>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className={`sticky top-0 backdrop-blur-md border-b z-20 ${darkMode ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-14">
          <div className="flex items-center gap-2">
            <div className="bg-amber-400 p-1.5 rounded-xl text-slate-900 shadow-sm"><Sun className="h-5 w-5 stroke-[2.5]" /></div>
            <div>
              <span className={`text-base sm:text-lg font-black tracking-tight ${darkMode ? "text-white" : "text-slate-900"}`}>JoyPulse<span className="text-amber-500">.</span></span>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest -mt-0.5">Asia • Good News Only</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[11px]">
            {totalMyReactions > 0 && (
              <>
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Your Smiles</p>
                  <p className="text-sm font-black text-amber-500 font-mono">{totalMyReactions}</p>
                </div>
                <div className={`h-5 w-px ${darkMode ? "bg-slate-700" : "bg-slate-100"}`} />
              </>
            )}
            {bookmarks.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowSavedShelf(true);
                    document.getElementById("saved-shelf")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  className="text-center hover:opacity-80 transition"
                  aria-label={`View ${bookmarks.size} saved stories`}
                >
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Saved</p>
                  <p className="text-sm font-black text-rose-500 font-mono">{bookmarks.size}</p>
                </button>
                <div className={`h-5 w-px ${darkMode ? "bg-slate-700" : "bg-slate-100"}`} />
              </>
            )}
            <div className="text-center">
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">Stories</p>
              <p className={`text-sm font-black font-mono ${darkMode ? "text-slate-100" : "text-slate-800"}`}>{articles.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode((d) => !d)}
              className={`p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 ${darkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              aria-label="Toggle dark mode"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1" title={lastUpdated}>
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">{editionLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── SECTION NAV: categories + search + regions ─────────── */}
      <div className={`sticky top-14 z-10 border-b ${darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Category tabs */}
            <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar flex-1 min-w-0">
              {availableCategories.map((id) => {
                const meta = CATEGORY_META[id] || CATEGORY_META.all;
                const sel = selectedCategory === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setSelectedCategory(id); setShowCount(12); }}
                    aria-pressed={sel}
                    className={`shrink-0 py-3 text-[11px] font-bold uppercase tracking-wide whitespace-nowrap border-b-2 transition focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset ${
                      sel
                        ? `border-amber-500 ${darkMode ? "text-white" : "text-slate-900"}`
                        : `border-transparent text-slate-500 ${darkMode ? "hover:text-slate-200" : "hover:text-slate-800"}`
                    }`}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Search — sits next to categories (where Arts & Culture ends) */}
            <div className={`hidden sm:flex items-center gap-1 rounded-lg border px-2 py-1 shrink-0 w-44 lg:w-52 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowCount(12); }}
                className={`w-full bg-transparent text-xs focus:outline-none placeholder-slate-400 min-w-0 ${darkMode ? "text-slate-100" : "text-slate-800"}`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="p-0.5 text-slate-400 hover:text-slate-600 shrink-0" aria-label="Clear">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Mobile search icon */}
            <button
              onClick={() => setSearchOpen((o) => !o)}
              className={`sm:hidden p-1.5 rounded-lg shrink-0 transition-colors ${searchOpen || searchQuery ? "bg-amber-100 text-amber-700" : darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"}`}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Region tabs — desktop */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              {REGION_TABS.map((r) => (
                <button key={r.id} onClick={() => { setSelectedRegion(r.id); setShowCount(12); }}
                  className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition ${
                    selectedRegion === r.id
                      ? "bg-slate-900 text-white"
                      : darkMode ? "text-slate-400 hover:bg-slate-800" : "text-slate-500 hover:bg-slate-100"
                  }`}>{r.label}</button>
              ))}
            </div>
          </div>

          {/* Mobile: expanded search row */}
          {searchOpen && (
            <div className={`sm:hidden pb-2.5 flex items-center gap-1 rounded-lg border px-2 py-1.5 mb-1 ${darkMode ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-200"}`}>
              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search stories…"
                value={searchQuery}
                autoFocus
                onChange={(e) => { setSearchQuery(e.target.value); setShowCount(12); }}
                className={`w-full bg-transparent text-xs focus:outline-none placeholder-slate-400 ${darkMode ? "text-slate-100" : "text-slate-800"}`}
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }} className="p-0.5 text-slate-400 shrink-0" aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Mobile region tabs */}
          <div className="md:hidden flex items-center gap-1 overflow-x-auto no-scrollbar pb-2">
            {REGION_TABS.map((r) => (
              <button key={r.id} onClick={() => { setSelectedRegion(r.id); setShowCount(12); }}
                className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition ${
                  selectedRegion === r.id
                    ? "bg-slate-900 text-white"
                    : darkMode ? "text-slate-400 bg-slate-800" : "text-slate-500 bg-slate-50"
                }`}>{r.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── DAILY QUOTE BANNER — desktop only to reduce mobile chrome ── */}
      <div className={`hidden sm:block ${darkMode ? "bg-amber-950/40 border-amber-900/50" : "bg-amber-50 border-amber-100"} border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-2.5">
          <Gift className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <p className={`text-[12px] leading-snug ${darkMode ? "text-amber-100" : "text-amber-900"}`}>
            <span className="italic font-semibold">&ldquo;{dailyQuote.text}&rdquo;</span>
            <span className="text-amber-600 font-bold not-italic"> — {dailyQuote.author}</span>
          </p>
        </div>
      </div>

      {/* ── MAGAZINE LEAD: full-width top story ─────────────────── */}
      <section className={`border-b ${darkMode ? "bg-slate-950 border-slate-800" : "bg-gradient-to-b from-amber-50/60 via-white to-slate-50 border-slate-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8">
          {/* Compact brand line */}
          <div className="flex flex-wrap items-center gap-2 mb-4 md:mb-5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${darkMode ? "bg-amber-900/40 text-amber-200 border-amber-700/50" : "bg-amber-100 text-amber-800 border-amber-200/50"}`}>
              <Sparkles className="h-3 w-3" />
              {editionLabel}
            </span>
            <span className={`text-[11px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
              Asia&rsquo;s good news · filtered for uplift
            </span>
            <span className={`hidden sm:inline text-[11px] ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
              · {joyMeter.emoji} {joyMeter.label}
            </span>
          </div>

          {topStory && (
            <button
              type="button"
              onClick={() => setSelectedId(topStory.id)}
              className={`group w-full text-left rounded-2xl border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                darkMode ? "bg-slate-900 border-amber-800/40" : "bg-white border-amber-200/80"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Image — magazine lead */}
                <div className={`relative min-h-[220px] md:min-h-[320px] overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                  <StoryImage
                    imageUrl={topStory.imageUrl}
                    category={topStory.category}
                    id={topStory.id}
                    title={topStory.title}
                    summary={topStory.summary}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                  <span className="absolute top-3 left-3 bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md flex items-center gap-1 shadow">
                    <Star className="h-3 w-3 fill-white" />Today&rsquo;s lead
                  </span>
                </div>
                {/* Copy */}
                <div className="p-5 sm:p-7 md:p-8 flex flex-col justify-center gap-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>{topStory.region === "singapore" ? "Singapore" : topStory.region === "asia" ? "Asia" : "World"}</span>
                    <span className="text-slate-300">·</span>
                    <span className={(CATEGORY_META[topStory.category] || CATEGORY_META.humanity).textColor}>
                      {(CATEGORY_META[topStory.category] || CATEGORY_META.humanity).label}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>{topStory.source}</span>
                    {topStory.llmVerified && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold normal-case tracking-normal">
                        Verified uplift
                      </span>
                    )}
                  </div>
                  <h1 className={`font-serif text-2xl sm:text-3xl md:text-[2rem] font-black leading-[1.15] group-hover:text-amber-600 transition-colors ${darkMode ? "text-slate-50" : "text-slate-900"}`}>
                    {topStory.title}
                  </h1>
                  <p className={`text-sm sm:text-[15px] leading-relaxed line-clamp-4 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                    {topStory.summary}
                  </p>
                  <span className="text-sm font-bold text-amber-600 flex items-center gap-1.5 mt-1">
                    Read the story <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* ── MAIN ───────────────────────────────────────────────── */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">

            {/* Today's 3 — numbered list with thumbs (not equal cards) */}
            {todaysThree.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <h2 className={`text-xs font-black uppercase tracking-widest ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                      Today&rsquo;s 3
                    </h2>
                  </div>
                  <span className={`text-[11px] font-medium ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
                    Your morning brief
                  </span>
                </div>
                <ol className={`rounded-2xl border divide-y overflow-hidden ${darkMode ? "bg-slate-900 border-slate-700 divide-slate-800" : "bg-white border-slate-200 divide-slate-100"}`}>
                  {todaysThree.map((a, i) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(a.id)}
                        className={`w-full flex gap-3 sm:gap-4 p-3 sm:p-3.5 text-left group hover:bg-amber-50/50 dark:hover:bg-slate-800/80 transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-400 ${darkMode ? "" : ""}`}
                      >
                        <span className="shrink-0 h-8 w-8 rounded-full bg-amber-500 text-white text-sm font-black flex items-center justify-center shadow-sm">
                          {i + 1}
                        </span>
                        <div className={`relative shrink-0 w-20 h-16 sm:w-28 sm:h-20 rounded-lg overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                          <StoryImage
                            imageUrl={a.imageUrl}
                            category={a.category}
                            id={a.id}
                            title={a.title}
                            summary={a.summary}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {a.region === "singapore" ? "Singapore" : a.region === "asia" ? "Asia" : "World"}
                            <span className="text-slate-300"> · </span>
                            <span className={(CATEGORY_META[a.category] || CATEGORY_META.humanity).textColor}>
                              {(CATEGORY_META[a.category] || CATEGORY_META.humanity).label}
                            </span>
                          </p>
                          <p className={`font-serif text-[14px] sm:text-[15px] font-bold leading-snug line-clamp-2 group-hover:text-amber-600 transition-colors ${darkMode ? "text-slate-100" : "text-slate-900"}`}>
                            {a.title}
                          </p>
                          <p className={`text-[12px] leading-relaxed line-clamp-1 sm:line-clamp-2 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                            {a.summary}
                          </p>
                        </div>
                        <ArrowRight className="hidden sm:block h-4 w-4 text-slate-300 group-hover:text-amber-500 shrink-0 self-center transition" />
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Newsletter + Support — high on page so they’re not lost in the feed */}
            <div
              id="join-support"
              className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${
                darkMode
                  ? "bg-slate-900 border-amber-800/40"
                  : "bg-gradient-to-br from-amber-50 via-white to-rose-50 border-amber-200"
              }`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6 items-stretch">
                {/* Newsletter */}
                <div className="lg:col-span-3 space-y-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Stay in the loop</p>
                    <h3 className={`text-base sm:text-lg font-black ${darkMode ? "text-white" : "text-slate-900"}`}>
                      Get Today&rsquo;s 3 in your inbox
                    </h3>
                    <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Short Asia good-news digest a few times a week. No spam. Unsubscribe anytime.
                    </p>
                  </div>
                  <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailStatus("idle"); }}
                      placeholder="you@email.com"
                      aria-label="Email for newsletter"
                      className={`flex-1 px-3 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-amber-400 ${darkMode ? "bg-slate-800 border-slate-600 text-white placeholder-slate-500" : "bg-white border-slate-200 text-slate-800"}`}
                    />
                    <button
                      type="submit"
                      disabled={emailStatus === "loading"}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-900 text-sm font-bold transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      {emailStatus === "ok" ? "Joined ✓" : emailStatus === "loading" ? "Joining…" : "Subscribe"}
                    </button>
                  </form>
                </div>

                {/* Support */}
                <div
                  className={`lg:col-span-2 flex flex-col justify-center gap-3 rounded-xl border p-4 ${
                    darkMode ? "bg-slate-950/50 border-slate-700" : "bg-white/80 border-rose-100"
                  }`}
                >
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-1">Keep it independent</p>
                    <h3 className={`text-sm font-black ${darkMode ? "text-white" : "text-slate-900"}`}>Support JoyPulse</h3>
                    <p className={`text-xs mt-1 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Fuel the filters and keep Asia&rsquo;s good news free for everyone.
                    </p>
                  </div>
                  <a
                    href="https://ko-fi.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    <Heart className="h-4 w-4" /> Support on Ko-fi
                  </a>
                </div>
              </div>
            </div>

            {/* Best of the Week */}
            {bestOfWeek.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Best of the Week</h3>
                </div>
                <StoryRail darkMode={darkMode}>
                  {bestOfWeek.map((a) => (
                    <button key={a.id} onClick={() => setSelectedId(a.id)}
                      className={`group shrink-0 w-52 text-left rounded-lg border hover:shadow-md transition-all overflow-hidden ${darkMode ? "bg-slate-900 border-slate-700 hover:border-slate-600" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                      <div className={`h-24 overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                        <StoryImage imageUrl={a.imageUrl} category={a.category} id={a.id}
                          title={a.title} summary={a.summary}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-2.5">
                        <p className={`font-serif text-[12px] font-bold leading-tight line-clamp-2 ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{a.title}</p>
                        <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide mt-1">{a.source}</p>
                      </div>
                    </button>
                  ))}
                </StoryRail>
              </div>
            )}

            {/* Singapore Spotlight — excludes top story + Best of the Week to avoid repeats */}
            {singaporeSpotlight.length > 0 && selectedRegion === "all" && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  <h3 className={`text-[10px] font-black uppercase tracking-widest ${darkMode ? "text-slate-400" : "text-slate-500"}`}>🇸🇬 Singapore Spotlight</h3>
                </div>
                <StoryRail darkMode={darkMode}>
                  {singaporeSpotlight.map((a) => (
                    <button key={a.id} onClick={() => setSelectedId(a.id)}
                      className={`group shrink-0 w-52 text-left rounded-lg border hover:shadow-md transition-all overflow-hidden ${darkMode ? "bg-slate-900 border-slate-700 hover:border-slate-600" : "bg-white border-slate-200 hover:border-slate-300"}`}>
                      <div className={`h-24 overflow-hidden ${darkMode ? "bg-slate-800" : "bg-slate-100"}`}>
                        <StoryImage imageUrl={a.imageUrl} category={a.category} id={a.id}
                          title={a.title} summary={a.summary}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                      <div className="p-2.5">
                        <p className={`font-serif text-[12px] font-bold leading-tight line-clamp-2 ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{a.title}</p>
                        <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide mt-1">{a.source}</p>
                      </div>
                    </button>
                  ))}
                </StoryRail>
              </div>
            )}

            {/* Count */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span><span className="font-black text-slate-800">{filtered.length}</span> stories match</span>
              <span className="flex items-center gap-1"><Compass className="h-3 w-3" />Sources: BBC, CNN, Guardian, NYT, CNA, Good News Network & more</span>
            </div>

            {/* Saved articles — compact horizontal shelf */}
            {bookmarks.size > 0 && (
              <div id="saved-shelf" className={`rounded-xl border shadow-sm p-3 flex items-center gap-3 overflow-x-auto no-scrollbar ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"}`}>
                <span className="shrink-0 flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest text-slate-400"><BookmarkCheck className="h-3 w-3 text-amber-500" />Saved</span>
                {articles.filter((a) => bookmarks.has(a.id)).slice(0, 10).map((a) => (
                  <button key={a.id} onClick={() => setSelectedId(a.id)}
                    className="shrink-0 max-w-[180px] text-left bg-slate-50 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg border border-slate-100 transition">
                    <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{a.title}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className={`rounded-2xl p-8 text-center border shadow-sm ${darkMode ? "bg-slate-900 border-slate-700" : "bg-white border-slate-200"}`}>
                <div className="text-3xl mb-2">☀️</div>
                <h3 className={`text-base font-bold ${darkMode ? "text-white" : "text-slate-900"}`}>No stories match right now</h3>
                <p className={`text-sm mt-1 ${darkMode ? "text-slate-400" : "text-slate-500"}`}>
                  Try another region or category — or reset to see Asia&rsquo;s good news again.
                </p>
                <button
                  onClick={() => { setSelectedCategory("all"); setSelectedRegion("all"); setSearchQuery(""); setShowCount(12); }}
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-5 py-2 rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  Reset filters
                </button>
              </div>
            )}

            {/* CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {visible.map((a) => {
                const rx = myReactions[a.id] || { happy: 0, heart: 0, celebrate: 0, mindblown: 0 };
                const totalRx = rx.happy + rx.heart + rx.celebrate + rx.mindblown;
                const isSaved = bookmarks.has(a.id);
                const catMeta = CATEGORY_META[a.category] || CATEGORY_META.humanity;
                const regionLabel = a.region === "singapore" ? "Singapore" : a.region === "asia" ? "Asia" : "World";

                return (
                  <article
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open story: ${a.title}`}
                    onClick={() => setSelectedId(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(a.id);
                      }
                    }}
                    className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
                  >

                    {/* Image */}
                    <div className="relative h-36 bg-slate-100 overflow-hidden shrink-0">
                      <StoryImage imageUrl={a.imageUrl} category={a.category} id={a.id}
                        title={a.title} summary={a.summary}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleBookmark(a.id); }}
                        className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1.5 rounded-md shadow-sm hover:bg-white transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                        aria-label={isSaved ? "Remove bookmark" : "Save story"}
                      >
                        {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> : <Bookmark className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                      {a.llmVerified && (
                        <span className="absolute top-2 left-2 bg-emerald-600/95 text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md shadow-sm">
                          Verified uplift
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-3.5 flex-grow flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex-wrap">
                        <span>{regionLabel}</span>
                        <span className="text-slate-300">·</span>
                        <span className={catMeta.textColor}>{catMeta.label}</span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-0.5 normal-case font-semibold"><Clock className="h-2.5 w-2.5" />{timeAgo(a.pubDate)}</span>
                      </div>

                      <h3 className="font-serif text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">{a.title}</h3>
                      <p className="text-[13px] text-slate-500 line-clamp-3 leading-relaxed">{a.summary}</p>
                      <div className="text-[10px] text-slate-400 font-semibold">via {a.source}</div>
                    </div>

                    {/* Footer */}
                    <div className="px-3 pb-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); addReaction(a.id, "happy", e); }}
                          className="flex items-center gap-0.5 hover:bg-amber-50 text-slate-500 hover:text-amber-700 px-1.5 py-1 rounded-md text-[11px] font-bold transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          aria-label="React happy"
                        >
                          😄 {totalRx > 0 && <span className="font-mono">{totalRx}</span>}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); shareTo(a, "whatsapp"); }}
                          className="p-1.5 rounded-md text-[#25D366] hover:bg-emerald-50 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                          aria-label="Share on WhatsApp"
                          title="WhatsApp"
                        >
                          <IconWhatsApp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); shareTo(a, "telegram"); }}
                          className="p-1.5 rounded-md text-[#26A5E4] hover:bg-sky-50 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                          aria-label="Share on Telegram"
                          title="Telegram"
                        >
                          <IconTelegram className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedId(a.id); }}
                          className="text-slate-500 hover:text-amber-600 font-bold text-[11px] flex items-center gap-0.5 transition focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
                        >
                          More <ArrowRight className="h-3 w-3" />
                        </button>
                        {a.sourceUrl && (
                          <a
                            href={a.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-blue-600 transition p-1 focus:outline-none focus:ring-2 focus:ring-amber-400 rounded"
                            aria-label="Open original article"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Load more */}
            {showCount < filtered.length && (
              <div className="flex justify-center pt-2">
                <button onClick={() => setShowCount((p) => p + 12)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95">
                  <ChevronDown className="h-3.5 w-3.5" />
                  Load More ({filtered.length - showCount} remaining)
                </button>
              </div>
            )}
        </div>
      </main>

      {/* ── FOOTER — How It Works lives here now, collapsible, so the main
           screen stays filled with articles instead of sidebar chrome. ── */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          <button
            type="button"
            onClick={() => setHowItWorksOpen((v) => !v)}
            aria-expanded={howItWorksOpen}
            aria-controls="how-it-works-panel"
            className="w-full flex items-center justify-between gap-1.5 p-5 text-left focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-inset"
          >
            <div className="flex items-center gap-1.5">
              <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative rounded-full h-2.5 w-2.5 bg-emerald-500" /></span>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">How It Works</h3>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${howItWorksOpen ? "rotate-180" : ""}`} />
          </button>
          {howItWorksOpen && (
            <div id="how-it-works-panel" className="px-5 pb-5 space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                JoyPulse scrapes <strong>real RSS news feeds</strong> daily across Asia — Singapore first, then Malaysia, Indonesia, Thailand, Vietnam, the Philippines, India and beyond — plus dedicated good-news outlets worldwide.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                We filter for genuine uplift: keyword checks, strict rejection of crime/disaster/markets noise, then an optional AI pass that only keeps stories scoring 7+/10. Singapore and Asia are ranked first. You always read the full piece on the original publisher site.
              </p>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1.5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Feed sources</p>
                <div className="flex flex-wrap gap-1">
                  {["CNA Singapore", "Mothership SG", "Straits Times SG", "Free Malaysia Today", "Jakarta Globe", "Antara News", "Rappler", "Bangkok Post", "VnExpress Int'l", "CNA Asia", "CNA World", "The Better India", "SCMP Asia", "Good News Network", "Positive News", "Good Good Good", "Reasons to be Cheerful", "Optimist Daily", "Tank's Good News", "DailyGood"].map((s) => (
                    <span key={s} className="bg-white/10 text-slate-300 text-[8px] font-bold px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
              <div className="text-[9px] text-slate-500 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> Last scraped: {new Date(lastUpdated).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </footer>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white mt-12 border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <div className="bg-amber-400 p-1 rounded-lg text-slate-950"><Sun className="h-4 w-4" /></div>
            <span className="text-sm font-black">JoyPulse<span className="text-amber-400">.</span></span>
          </div>
          <p className="text-[11px] text-slate-400 max-w-md mx-auto">
            Real positive news from across Asia — Singapore spotlight + regional highlights. Filtered for genuine uplift. Static, private, no tracking.
          </p>
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-semibold" aria-label="Footer">
            <Link href="/policies" className="text-slate-300 hover:text-amber-400 transition">Policies</Link>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <Link href="/terms" className="text-slate-300 hover:text-amber-400 transition">Terms</Link>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <Link href="/contact" className="text-slate-300 hover:text-amber-400 transition">Contact Us</Link>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-amber-400 hover:text-amber-300 transition">
              {SUPPORT_EMAIL}
            </a>
          </nav>
          <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase flex flex-wrap justify-center gap-3">
            <span>🌏 Best of Asia</span><span>🇸🇬 Singapore Spotlight</span><span>✨ Zero Negativity</span><span>📱 Mobile Friendly</span><span>🔒 No Tracking</span>
          </div>
          <p className="text-[10px] text-slate-600">© {new Date().getFullYear()} JoyPulse • Static site • No server • No database • No cookies</p>
        </div>
      </footer>

      {/* ── ARTICLE DETAIL MODAL ───────────────────────────────── */}
      {selectedArticle && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto"
          onClick={() => setSelectedId(null)}
          role="presentation"
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="story-modal-title"
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  selectedArticle.region === "singapore" ? "bg-red-50 text-red-600 border-red-100" : selectedArticle.region === "asia" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>{selectedArticle.region}</span>
                <span className="text-slate-400">📍 {selectedArticle.location}</span>
                <span className="text-slate-400">• {timeAgo(selectedArticle.pubDate)}</span>
                {selectedArticle.llmVerified && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold uppercase">Verified uplift</span>
                )}
              </div>
              <button
                ref={closeModalBtnRef}
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-1.5 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-700 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                aria-label="Close story"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              <h2 id="story-modal-title" className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                {selectedArticle.title}
              </h2>

              <div className="rounded-xl overflow-hidden bg-slate-100">
                <StoryImage
                  imageUrl={selectedArticle.imageUrl}
                  category={selectedArticle.category}
                  id={selectedArticle.id}
                  title={selectedArticle.title}
                  summary={selectedArticle.summary}
                  alt=""
                  className="w-full max-h-72 object-cover"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span>Source: <strong className="text-amber-600">{selectedArticle.source}</strong></span>
                <span className="text-slate-400">Preview on JoyPulse · full story on publisher site</span>
              </div>

              <div className="bg-amber-500/5 border-l-4 border-amber-400 p-4 rounded-r-xl">
                <p className="text-[14px] text-slate-800 leading-relaxed">{selectedArticle.summary}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedArticle.sourceUrl && (
                  <a
                    href={selectedArticle.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[140px] bg-slate-900 hover:bg-slate-800 text-white text-center font-bold py-2.5 rounded-xl text-sm shadow transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400"
                  >
                    Read Full Story →
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => shareStory(selectedArticle)}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm shadow transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => toggleBookmark(selectedArticle.id)}
                  className={`px-3 py-2.5 rounded-xl border font-bold text-sm transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400 ${bookmarks.has(selectedArticle.id) ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                  aria-label={bookmarks.has(selectedArticle.id) ? "Remove bookmark" : "Save story"}
                >
                  {bookmarks.has(selectedArticle.id) ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                </button>
              </div>

              {/* Social share row — brand logos */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Share this story</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => shareTo(selectedArticle, "whatsapp")}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 text-[#128C7E] text-xs font-bold hover:bg-[#25D366]/20 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                    aria-label="Share on WhatsApp"
                  >
                    <IconWhatsApp className="h-4 w-4 text-[#25D366]" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => shareTo(selectedArticle, "telegram")}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#26A5E4]/30 bg-[#26A5E4]/10 text-[#229ED9] text-xs font-bold hover:bg-[#26A5E4]/20 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                    aria-label="Share on Telegram"
                  >
                    <IconTelegram className="h-4 w-4 text-[#26A5E4]" />
                    Telegram
                  </button>
                  <button
                    type="button"
                    onClick={() => shareTo(selectedArticle, "x")}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-300 bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                    aria-label="Share on X"
                  >
                    <IconX className="h-3.5 w-3.5" />
                    Post
                  </button>
                  <button
                    type="button"
                    onClick={() => shareTo(selectedArticle, "facebook")}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1877F2]/30 bg-[#1877F2]/10 text-[#1877F2] text-xs font-bold hover:bg-[#1877F2]/20 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                    aria-label="Share on Facebook"
                  >
                    <IconFacebook className="h-4 w-4" />
                    Facebook
                  </button>
                  <button
                    type="button"
                    onClick={() => shareTo(selectedArticle, "copy")}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-xs font-bold hover:bg-amber-100 transition focus:outline-none focus:ring-2 focus:ring-amber-400"
                    aria-label="Copy link"
                  >
                    <Link2 className="h-4 w-4" />
                    Copy link
                  </button>
                </div>
              </div>

              {/* Reactions */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center space-y-2.5">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">How does this make you feel?</h4>
                <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Reactions">
                  {REACTION_TYPES.map((rt) => {
                    const rx = myReactions[selectedArticle.id] || { happy: 0, heart: 0, celebrate: 0, mindblown: 0 };
                    return (
                      <button
                        key={rt.key}
                        type="button"
                        onClick={(e) => addReaction(selectedArticle.id, rt.key, e)}
                        className="bg-white hover:bg-amber-50 border border-slate-200 p-2 rounded-xl transition active:scale-95 flex flex-col items-center gap-0.5 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400"
                        aria-label={`${rt.label}, ${rx[rt.key]} times`}
                      >
                        <span className="text-xl" aria-hidden="true">{rt.emoji}</span>
                        <span className="text-[9px] font-black uppercase text-slate-400">{rt.label}</span>
                        <span className="text-[11px] font-mono font-black text-slate-800">{rx[rt.key]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400">Your reactions are saved locally in this browser only.</p>
              </div>

              <button
                type="button"
                onClick={() => toggleBookmark(selectedArticle.id)}
                className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  bookmarks.has(selectedArticle.id)
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                {bookmarks.has(selectedArticle.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                {bookmarks.has(selectedArticle.id) ? "Saved ✓" : "Save for Later"}
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2 rounded-xl text-sm shadow transition active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
