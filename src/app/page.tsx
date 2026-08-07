import { readFileSync } from "fs";
import { resolve } from "path";
import ClientPage from "./client-page";

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

interface FeedData {
  lastUpdated: string;
  count: number;
  articles: FeedArticle[];
}

function loadFeed(): FeedData {
  try {
    const feedPath = resolve(process.cwd(), "public", "feed.json");
    const raw = readFileSync(feedPath, "utf-8");
    return JSON.parse(raw) as FeedData;
  } catch {
    return { lastUpdated: new Date().toISOString(), count: 0, articles: [] };
  }
}

export default function HomePage() {
  const feed = loadFeed();

  return (
    <main className="min-h-screen bg-slate-50">
      <ClientPage articles={feed.articles} lastUpdated={feed.lastUpdated} />
    </main>
  );
}
