# ☀️ JoyPulse — Asia's Good News, in One Place

> **A beautiful relief from the chaos.**  
> A fully static site that scrapes 18 real RSS news feeds across Asia and beyond, filters for positivity, and deploys to GitHub Pages. No server. No database. No tracking.

![Next.js](https://img.shields.io/badge/Next.js_16-Static_Export-black?logo=next.js)
![GitHub Pages](https://img.shields.io/badge/Deployed_on-GitHub_Pages-blue?logo=github)
![RSS](https://img.shields.io/badge/18_RSS_Feeds-Live-orange)

---

## How It Works

```
┌─────────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  GitHub Action       │     │  public/feed.json │     │  Static HTML/CSS/JS│
│  (runs 2x daily)     │────▶│  (committed to    │────▶│  (deployed to      │
│  scrape-news.mjs     │     │   the repo)       │     │   GitHub Pages)    │
│  • Fetches 9 feeds   │     │  • 300 articles   │     │  • output: export  │
│  • Scores positivity │     │  • Deduped        │     │  • No server needed│
│  • Filters negativity│     │  • Sorted by date │     │  • localStorage UI │
└─────────────────────┘     └──────────────────┘     └────────────────────┘
```

### RSS Sources (Singapore first, then Asia, then dedicated positive-news)
| Source | Region | URL |
|--------|--------|-----|
| CNA Singapore | 🇸🇬 Singapore | channelnewsasia.com |
| CNA Asia | 🌏 Asia | channelnewsasia.com |
| CNA World | 🌍 World | channelnewsasia.com |
| Mothership SG | 🇸🇬 Singapore | mothership.sg |
| Good News Network | 🌍 World | goodnewsnetwork.org |
| Positive News | 🌍 World | positive.news |
| Good Good Good | 🌍 World | goodgoodgood.co |
| The Better India | 🌏 Asia | thebetterindia.com |
| Sunny Skyz | 🌍 World | sunnyskyz.com |

### Positivity Filter — two-pass (strict)
1. **Keyword pre-filter**: Requires **3+** positive keyword hits for general news sources, **2+** for curated positive-news sources. Expanded negatives for markets, dry sports scores, crime, disaster.
2. **LLM verification**: Stories scoring **below 7** are rejected. Falls back to keyword-only if no API key is set.
- **Homepage**: **Today's 3** (daily habit), Singapore Spotlight, Best of the Week — deduped across sections.
- **Ranking**: LLM-verified + higher llmScore + Singapore/Asia boost + keyword score.

### Newsletter (optional)
Add **one** secret under Settings → Secrets → Actions, then redeploy:

| Secret | Provider |
|--------|----------|
| `FORMSPREE_ID` | Formspree form id |
| `NEWSLETTER_EMAIL` | Your inbox via FormSubmit |
| `BUTTONDOWN_USER` | Buttondown username |

Without a secret, signups still save in the visitor's browser so the UI works while you configure a provider.

---

## 🚀 Deploy to GitHub Pages

### 1. Fork or clone this repo
```bash
git clone https://github.com/YOUR_USERNAME/joypulse.git
cd joypulse
npm install
```

### 2. Enable GitHub Pages
1. Go to your repo → **Settings** → **Pages**
2. Source: **GitHub Actions**

### 3. (Optional but recommended) Add your OpenRouter API key
This enables the LLM sentiment-verification pass. Without it, the site still works fine on keyword filtering alone.
1. Get a free key at [openrouter.ai](https://openrouter.ai/keys)
2. Go to your repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
3. Name: `OPENROUTER_API_KEY`, value: your key
4. **Never commit your API key directly into any file in the repo** — it should only ever live as a GitHub secret. If a key is ever accidentally exposed (e.g. pasted somewhere public), revoke it immediately from the OpenRouter dashboard and generate a new one.

### 4. Push to main
```bash
git push origin main
```

The **deploy.yml** workflow will automatically:
- Build the static export (`next build` → `/out`)
- Deploy to GitHub Pages

The **scrape.yml** workflow runs once daily at 1am SGT and:
- Fetches all 18 RSS feeds
- Scores & filters articles (keyword pass, then LLM verification if configured)
- Commits updated `feed.json` to the repo
- This triggers a fresh deploy

### Manual scrape
You can also trigger a scrape from the GitHub Actions tab → "Scrape RSS Feeds" → "Run workflow". Do this once right after your first deploy so the site isn't empty while waiting for the next scheduled run.

---

## 💻 Local Development

```bash
npm install

# Run the scraper to populate feed.json
node scripts/scrape-news.mjs

# Start dev server
npm run dev
```

Open http://localhost:3000

---

## 📁 Project Structure
```
joypulse/
├── scripts/
│   └── scrape-news.mjs          # RSS scraper (runs in GitHub Action)
├── public/
│   └── feed.json                 # Static article data (auto-updated)
├── src/app/
│   ├── page.tsx                  # Reads feed.json at build time
│   ├── client-page.tsx           # Full interactive UI (localStorage)
│   ├── layout.tsx                # Root layout + SEO
│   └── globals.css               # Tailwind + animations
├── .github/workflows/
│   ├── scrape.yml                # Cron: scrape RSS → commit feed.json
│   └── deploy.yml                # Build & deploy to GitHub Pages
├── next.config.ts                # output: 'export' (static)
└── README.md
```

## Key Design Decisions
- **No database** — all data lives in `feed.json`, committed to the repo
- **No server** — `output: 'export'` produces plain HTML/CSS/JS
- **No API keys** — RSS feeds are free and public
- **No tracking** — no cookies, no analytics, no accounts
- **localStorage only** — emoji reactions and bookmarks are per-browser
- **Links out** — articles link to original sources, not reproduced (copyright)

---

## 📄 License

MIT — free to use, modify, and distribute.

<p align="center"><strong>☀️ What you focus on grows. Focus on the good. ☀️</strong></p>
