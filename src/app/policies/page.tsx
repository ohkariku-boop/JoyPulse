import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Policies – JoyPulse",
  description: "Privacy and content policies for JoyPulse.",
};

export default function PoliciesPage() {
  return (
    <LegalShell title="Policies">
      <p className="text-slate-500 text-sm">Last updated: August 2026</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Privacy</h2>
      <p>
        JoyPulse is a static website. We do not run user accounts, do not use tracking cookies for advertising,
        and do not sell personal data.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Newsletter:</strong> If you subscribe, your email is processed by our form provider (e.g. Formspree)
          so we can send the digest. You can unsubscribe at any time.
        </li>
        <li>
          <strong>Local storage:</strong> Reactions, bookmarks, and theme preference are stored only in your browser
          on this device. We cannot see them.
        </li>
        <li>
          <strong>Analytics:</strong> We use privacy-friendly pageview counts via{" "}
          <a href="https://www.goatcounter.com/" className="text-amber-700 font-semibold hover:underline" target="_blank" rel="noopener noreferrer">
            GoatCounter
          </a>{" "}
          (no advertising cookies, no personal profiles). We do not use Google Analytics or ad trackers.
        </li>
      </ul>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Content</h2>
      <p>
        JoyPulse curates headlines and summaries from public RSS feeds. Full articles remain on the original
        publishers&apos; sites. We filter for uplifting stories using automated keyword rules and, when available,
        an AI review pass. Filtering is imperfect; borderline items may occasionally appear.
      </p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Copyright</h2>
      <p>
        Story text and images belong to their respective publishers. JoyPulse does not claim ownership of third-party
        content. If you are a rights holder and need something removed, contact us using the email below.
      </p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Contact</h2>
      <p>
        Support:{" "}
        <a href="mailto:joypulse.support@proton.me" className="text-amber-700 font-semibold hover:underline">
          joypulse.support@proton.me
        </a>
      </p>
    </LegalShell>
  );
}
