"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Sun, Heart, Sparkles, Cpu, Globe, Trophy, Music, Search,
  X, ArrowRight, Compass, Gift, ExternalLink, MapPin,
  Clock, Briefcase, Bookmark, BookmarkCheck, ChevronDown,
} from "lucide-react";

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
  { text: "Right now, somewhere in Singapore, a hawker is giving away meals. Across Asia, a forest is being replanted. Around the world, a scientist just had a breakthrough. Focus on the good.", author: "JoyPulse" },
  { text: "Kindness doesn't make the headlines, but it's happening in a thousand quiet places today.", author: "JoyPulse" },
  { text: "Somewhere nearby, a stranger just helped another stranger for no reason at all. That's the world too.", author: "JoyPulse" },
  { text: "Good news doesn't shout. It just keeps happening, one small act at a time.", author: "JoyPulse" },
  { text: "Every day, more gets fixed, healed, planted, and shared than the headlines ever show.", author: "JoyPulse" },
  { text: "A child learned something new today. Somewhere else, someone finally got the help they needed. Both are real.", author: "JoyPulse" },
  { text: "The world is quietly kinder than the news makes it look.", author: "JoyPulse" },
  { text: "One good deed doesn't need an audience to matter.", author: "JoyPulse" },
  { text: "Progress rarely trends, but it never really stops either.", author: "JoyPulse" },
  { text: "Somewhere today, a community rebuilt something together that felt impossible alone.", author: "JoyPulse" },
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
  humanity: { icon: Heart,     label: "Kindness",      pillColor: "bg-rose-50 text-rose-700 border-rose-200",         textColor: "text-rose-600"    },
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

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600",
];

function placeholderFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return PLACEHOLDER_IMAGES[Math.abs(hash) % PLACEHOLDER_IMAGES.length];
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
  const [showCount, setShowCount]               = useState(20);

  // per-article localStorage reactions  { [articleId]: { happy: n, … } }
  const [myReactions, setMyReactions] = useState<Record<string, Record<ReactionKey, number>>>({});
  // bookmarks
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  // detail modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // floating emojis
  const [floats, setFloats] = useState<{ id: number; x: number; y: number; emoji: string }[]>([]);
  // toast
  const [toast, setToast] = useState<string | null>(null);

  /* ── hydrate from localStorage ─────────────────────────────── */
  useEffect(() => {
    setMyReactions(lsGet("jp_reactions", {}));
    const bk: string[] = lsGet("jp_bookmarks", []);
    setBookmarks(new Set(bk));
  }, []);

  /* ── persist ───────────────────────────────────────────────── */
  useEffect(() => { lsSet("jp_reactions", myReactions); }, [myReactions]);
  useEffect(() => { lsSet("jp_bookmarks", Array.from(bookmarks)); }, [bookmarks]);

  /* ── helpers ───────────────────────────────────────────────── */
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

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
  const availableCategories = useMemo(() => {
    const cats = new Set(articles.map((a) => a.category));
    return ["all", ...Object.keys(CATEGORY_META).filter((k) => k !== "all" && cats.has(k))];
  }, [articles]);

  /* ═════════════════════════════════════════════════════════════ */
  /* RENDER                                                        */
  /* ═════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-amber-100 selection:text-amber-900">

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

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-14">
          <div className="flex items-center gap-2">
            <div className="bg-amber-400 p-1.5 rounded-xl text-slate-900 shadow-sm animate-pulse-glow"><Sun className="h-5 w-5 stroke-[2.5]" /></div>
            <div>
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900">JoyPulse<span className="text-amber-500">.</span></span>
              <p className="text-[8px] sm:text-[9px] font-semibold text-slate-400 uppercase tracking-widest -mt-1">Asia • Good News Only</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px]">
            <div className="text-center"><p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Your Smiles</p><p className="text-sm font-black text-amber-500 font-mono">{totalMyReactions}</p></div>
            <div className="h-5 w-px bg-slate-100" />
            <div className="text-center"><p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Saved</p><p className="text-sm font-black text-rose-500 font-mono">{bookmarks.size}</p></div>
            <div className="h-5 w-px bg-slate-100" />
            <div className="text-center"><p className="text-[8px] text-slate-400 uppercase font-bold tracking-widest">Stories</p><p className="text-sm font-black text-slate-800 font-mono">{articles.length}</p></div>
          </div>
          <div className="text-[9px] text-slate-400 font-semibold flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="hidden sm:inline">Updated {timeAgo(lastUpdated)}</span>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-amber-50 via-white to-slate-50 py-8 md:py-12 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 border border-amber-200/50">
            <Sparkles className="h-3 w-3" />
            {articles.length} Real Positive Stories • Sourced from {new Set(articles.map((a) => a.source)).size} Sources
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-2xl mx-auto">
            <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent">Asia&rsquo;s</span> good news, in one place
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            A daily digest of real, positive stories from CNA, Good News Network, Positive News, The Better India & more.
          </p>

          {/* Search */}
          <div className="mt-5 max-w-lg mx-auto">
            <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-1 flex gap-1">
              <div className="relative flex-grow flex items-center pl-3">
                <Search className="absolute left-3.5 text-slate-400 h-4 w-4" />
                <input type="text" placeholder="Search stories, sources, locations…" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setShowCount(20); }}
                  className="w-full bg-transparent pl-7 pr-3 py-2 text-xs focus:outline-none text-slate-800 placeholder-slate-400" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="p-0.5 rounded-full hover:bg-slate-100 text-slate-400"><X className="h-3.5 w-3.5" /></button>}
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "new" | "popular")}
                className="bg-slate-50 text-slate-700 text-[11px] font-bold rounded-xl px-2.5 py-1.5 border-0 focus:ring-2 focus:ring-amber-400">
                <option value="new">⏰ Latest</option><option value="popular">🔥 Top Scored</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN ───────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT — feed */}
          <div className="lg:col-span-8 space-y-4">

            {/* Region tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              {REGION_TABS.map((r) => (
                <button key={r.id} onClick={() => { setSelectedRegion(r.id); setShowCount(20); }}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition border ${
                    selectedRegion === r.id ? "bg-slate-900 text-white border-slate-900 shadow-sm" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}>{r.label}</button>
              ))}
            </div>

            {/* Category pills */}
            <div className="flex overflow-x-auto gap-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {availableCategories.map((id) => {
                const meta = CATEGORY_META[id] || CATEGORY_META.all;
                const Icon = meta.icon;
                const sel = selectedCategory === id;
                return (
                  <button key={id} onClick={() => { setSelectedCategory(id); setShowCount(20); }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition ${
                      sel ? "bg-slate-900 border-slate-900 text-white shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}>
                    <Icon className={`h-3 w-3 ${sel ? "text-amber-400" : ""}`} />{meta.label}
                  </button>
                );
              })}
            </div>

            {/* Count */}
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold">
              <span><span className="font-black text-slate-800">{filtered.length}</span> stories match</span>
              <span className="flex items-center gap-1"><Compass className="h-3 w-3" />Sources: CNA, Good News Network, Positive News & more</span>
            </div>

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-sm">
                <div className="text-3xl mb-2">🔍</div>
                <h3 className="text-base font-bold text-slate-900">No stories match your filters</h3>
                <p className="text-xs text-slate-500 mt-1">Try a different search, region, or category.</p>
                <button onClick={() => { setSelectedCategory("all"); setSelectedRegion("all"); setSearchQuery(""); }}
                  className="mt-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-1.5 rounded-lg text-xs transition">Reset All</button>
              </div>
            )}

            {/* CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {visible.map((a) => {
                const rx = myReactions[a.id] || { happy: 0, heart: 0, celebrate: 0, mindblown: 0 };
                const totalRx = rx.happy + rx.heart + rx.celebrate + rx.mindblown;
                const isSaved = bookmarks.has(a.id);
                const catMeta = CATEGORY_META[a.category] || CATEGORY_META.humanity;
                const regionLabel = a.region === "singapore" ? "Singapore" : a.region === "asia" ? "Asia" : "World";

                return (
                  <article key={a.id}
                    className="group bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">

                    {/* Image */}
                    <div className="relative h-32 bg-slate-100 overflow-hidden shrink-0">
                      <img src={a.imageUrl || placeholderFor(a.id)} alt="" loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        onError={(e) => { (e.target as HTMLImageElement).src = placeholderFor(a.id); }} />
                      <button onClick={(e) => { e.stopPropagation(); toggleBookmark(a.id); }}
                        className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1 rounded-md shadow-sm hover:bg-white transition">
                        {isSaved ? <BookmarkCheck className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> : <Bookmark className="h-3.5 w-3.5 text-slate-400" />}
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-3 flex-grow flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-slate-400">
                        <span>{regionLabel}</span>
                        <span className="text-slate-300">·</span>
                        <span className={catMeta.textColor}>{a.category}</span>
                        <span className="text-slate-300">·</span>
                        <span className="flex items-center gap-0.5"><MapPin className="h-2 w-2" />{a.location}</span>
                        <span className="ml-auto flex items-center gap-0.5 normal-case font-semibold text-slate-400"><Clock className="h-2 w-2" />{timeAgo(a.pubDate)}</span>
                      </div>

                      <h3 className="font-serif text-[15px] font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-amber-700 transition-colors">{a.title}</h3>
                      <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-relaxed">{a.summary}</p>
                      <div className="text-[8px] text-slate-400 font-semibold uppercase tracking-wide">via {a.source}</div>
                    </div>

                    {/* Footer */}
                    <div className="px-3 pb-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button onClick={(e) => { e.stopPropagation(); addReaction(a.id, "happy", e); }}
                          className="flex items-center gap-0.5 hover:bg-amber-50 text-slate-500 hover:text-amber-700 px-1.5 py-0.5 rounded-md text-[10px] font-bold transition active:scale-95">
                          😄 {totalRx > 0 && <span className="font-mono">{totalRx}</span>}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedId(a.id)} className="text-slate-400 hover:text-amber-600 font-bold text-[10px] flex items-center gap-0.5 transition">
                          More <ArrowRight className="h-3 w-3" />
                        </button>
                        {a.sourceUrl && (
                          <a href={a.sourceUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                            className="text-slate-400 hover:text-blue-600 transition"><ExternalLink className="h-3 w-3" /></a>
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
                <button onClick={() => setShowCount((p) => p + 20)}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold px-6 py-2.5 rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition active:scale-95">
                  <ChevronDown className="h-3.5 w-3.5" />
                  Load More ({filtered.length - showCount} remaining)
                </button>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR — sticky so it stays visible alongside the article
              list instead of ending early and leaving empty space beneath it
              once the list runs much longer than the sidebar's own content. */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">

            {/* About */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-24 w-24 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-1.5">
                <span className="flex h-2.5 w-2.5 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative rounded-full h-2.5 w-2.5 bg-emerald-500" /></span>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">How It Works</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                JoyPulse scrapes <strong>18 real RSS news feeds</strong> daily across Asia — Singapore, Malaysia, Indonesia, Thailand, Vietnam, the Philippines, and beyond — plus dedicated good-news outlets.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Each article is scored against <strong>200+ positive keywords</strong>, filtered through <strong>100+ negative patterns</strong>, then double-checked by an AI model for genuine positivity. Only real, verified-good stories make it here.
              </p>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 space-y-1.5">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Feed sources</p>
                <div className="flex flex-wrap gap-1">
                  {["CNA Singapore", "Mothership SG", "Straits Times SG", "Free Malaysia Today", "The Star Malaysia", "Jakarta Globe", "Antara News", "Rappler", "Bangkok Post", "VnExpress Int'l", "CNA Asia", "CNA World", "The Better India", "Good News Network", "Positive News", "Good Good Good", "Sunny Skyz", "Reasons to be Cheerful", "Optimist Daily", "Tank's Good News"].map((s) => (
                    <span key={s} className="bg-white/10 text-slate-300 text-[8px] font-bold px-1.5 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              </div>
              <div className="text-[9px] text-slate-500 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> Last scraped: {new Date(lastUpdated).toLocaleString()}
              </div>
            </div>

            {/* Positivity capsule */}
            <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2.5">
              <div className="flex items-center gap-1.5 text-amber-500"><Gift className="h-4 w-4" /><h3 className="text-[9px] uppercase font-bold tracking-widest text-slate-400">Daily Positivity Capsule</h3></div>
              <div className="pl-3 border-l-3 border-amber-400 py-0.5">
                <p className="text-[11px] font-semibold text-slate-700 italic leading-relaxed">
                  &ldquo;{dailyQuote.text}&rdquo;
                </p>
                <span className="block text-[9px] font-bold text-slate-400 mt-1">— {dailyQuote.author}</span>
              </div>
            </div>

            {/* Your stats */}
            <div className="bg-gradient-to-tr from-slate-900 to-slate-950 text-white rounded-2xl p-4 shadow-xl border border-slate-800 space-y-3">
              <h3 className="text-[9px] font-bold uppercase tracking-widest text-amber-400">Your Activity (This Browser)</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10"><p className="text-lg font-black text-amber-400">{totalMyReactions}</p><p className="text-[8px] text-slate-400 font-bold uppercase">Reactions</p></div>
                <div className="bg-white/5 rounded-xl p-2.5 border border-white/10"><p className="text-lg font-black text-rose-400">{bookmarks.size}</p><p className="text-[8px] text-slate-400 font-bold uppercase">Saved</p></div>
              </div>
              <p className="text-[9px] text-slate-500 leading-relaxed">All reactions and bookmarks are saved locally in your browser. No accounts needed — your positivity is yours.</p>
            </div>

            {/* Saved articles */}
            {bookmarks.size > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-2.5">
                <h3 className="text-[9px] uppercase font-bold tracking-widest text-slate-400 flex items-center gap-1"><BookmarkCheck className="h-3 w-3 text-amber-500" />Saved Stories</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {articles.filter((a) => bookmarks.has(a.id)).slice(0, 10).map((a) => (
                    <button key={a.id} onClick={() => setSelectedId(a.id)} className="w-full text-left bg-slate-50 hover:bg-amber-50 p-2 rounded-lg border border-slate-100 transition">
                      <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{a.title}</p>
                      <p className="text-[8px] text-slate-400">{a.source} • {timeAgo(a.pubDate)}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile stats */}
            <div className="grid grid-cols-3 gap-1.5 md:hidden">
              <div className="bg-white p-2 rounded-lg border border-slate-100 text-center"><p className="text-[7px] text-slate-400 uppercase font-bold">Reactions</p><p className="text-xs font-black text-amber-500">{totalMyReactions}</p></div>
              <div className="bg-white p-2 rounded-lg border border-slate-100 text-center"><p className="text-[7px] text-slate-400 uppercase font-bold">Saved</p><p className="text-xs font-black text-rose-500">{bookmarks.size}</p></div>
              <div className="bg-white p-2 rounded-lg border border-slate-100 text-center"><p className="text-[7px] text-slate-400 uppercase font-bold">Stories</p><p className="text-xs font-black text-slate-800">{articles.length}</p></div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white mt-12 border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <div className="flex items-center justify-center gap-2"><div className="bg-amber-400 p-1 rounded-lg text-slate-950"><Sun className="h-4 w-4" /></div><span className="text-sm font-black">JoyPulse<span className="text-amber-400">.</span></span></div>
          <p className="text-[10px] text-slate-400 max-w-md mx-auto">Real positive news from Singapore & Asia. Scraped from 9 RSS feeds, filtered for positivity, deployed as a static site to GitHub Pages.</p>
          <div className="text-[9px] text-slate-500 font-bold tracking-widest uppercase flex flex-wrap justify-center gap-3">
            <span>🇸🇬 Singapore First</span><span>🌏 Asia Focus</span><span>✨ Zero Negativity</span><span>📱 Mobile Friendly</span><span>🔒 No Tracking</span>
          </div>
          <p className="text-[8px] text-slate-600">© {new Date().getFullYear()} JoyPulse • Static site • No server • No database • No cookies</p>
        </div>
      </footer>

      {/* ── ARTICLE DETAIL MODAL ───────────────────────────────── */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto" onClick={() => setSelectedId(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-1.5 text-[9px]">
                <span className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  selectedArticle.region === "singapore" ? "bg-red-50 text-red-600 border-red-100" : selectedArticle.region === "asia" ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-100 text-slate-600 border-slate-200"
                }`}>{selectedArticle.region}</span>
                <span className="text-slate-400">📍 {selectedArticle.location}</span>
                <span className="text-slate-400">• {timeAgo(selectedArticle.pubDate)}</span>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-1 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-700 transition"><X className="h-4 w-4" /></button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto p-5 space-y-4">
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">{selectedArticle.title}</h2>

              {/* Image */}
              <div className="rounded-xl overflow-hidden bg-slate-100">
                <img src={selectedArticle.imageUrl || placeholderFor(selectedArticle.id)} alt="" className="w-full max-h-72 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = placeholderFor(selectedArticle.id); }} />
              </div>

              {/* Source info */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span>Source: <strong className="text-amber-600">{selectedArticle.source}</strong></span>
                {selectedArticle.sourceUrl && (
                  <a href={selectedArticle.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-blue-600 hover:underline font-bold">
                    <ExternalLink className="h-3 w-3" />Read Original Article ↗
                  </a>
                )}
              </div>

              {/* Summary */}
              <div className="bg-amber-500/5 border-l-4 border-amber-400 p-3 rounded-r-xl">
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">{selectedArticle.summary}</p>
              </div>

              {selectedArticle.sourceUrl && (
                <a href={selectedArticle.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="block w-full bg-slate-900 hover:bg-slate-800 text-white text-center font-bold py-2.5 rounded-xl text-xs shadow transition active:scale-[0.98]">
                  Read Full Story on {selectedArticle.source} →
                </a>
              )}

              {/* Reactions */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center space-y-2.5">
                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">How does this make you feel?</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {REACTION_TYPES.map((rt) => {
                    const rx = myReactions[selectedArticle.id] || { happy: 0, heart: 0, celebrate: 0, mindblown: 0 };
                    return (
                      <button key={rt.key} onClick={(e) => addReaction(selectedArticle.id, rt.key, e)}
                        className="bg-white hover:bg-amber-50 border border-slate-200 p-2 rounded-xl transition active:scale-95 flex flex-col items-center gap-0.5 shadow-sm cursor-pointer">
                        <span className="text-xl">{rt.emoji}</span>
                        <span className="text-[7px] font-black uppercase text-slate-400">{rt.label}</span>
                        <span className="text-[10px] font-mono font-black text-slate-800">{rx[rt.key]}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[8px] text-slate-400">Your reactions are saved locally in this browser only.</p>
              </div>

              {/* Bookmark */}
              <button onClick={() => toggleBookmark(selectedArticle.id)}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border transition active:scale-[0.98] ${
                  bookmarks.has(selectedArticle.id)
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                }`}>
                {bookmarks.has(selectedArticle.id) ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                {bookmarks.has(selectedArticle.id) ? "Saved ✓" : "Save for Later"}
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button onClick={() => setSelectedId(null)} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-1.5 rounded-xl text-xs shadow transition active:scale-95">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
