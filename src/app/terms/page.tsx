import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms of use for JoyPulse, the Asia positive news reader. Free good-news website terms and acceptable use.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use">
      <p className="text-slate-500 text-sm">Last updated: August 2026</p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Using JoyPulse</h2>
      <p>
        JoyPulse is provided free of charge as a curated good-news reader. By using the site you agree to these terms.
        The service is offered &quot;as is&quot; without warranties of any kind.
      </p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Not professional advice</h2>
      <p>
        Content is for general information and morale only. It is not medical, legal, financial, or professional advice.
        Always read the full story on the publisher&apos;s site for context.
      </p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Accuracy &amp; filtering</h2>
      <p>
        We aim to surface genuinely uplifting stories, but automated filters can miss nuance. JoyPulse does not guarantee
        that every item is free of controversy or that summaries are complete. Links may break or change when publishers update their sites.
      </p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Acceptable use</h2>
      <p>
        Do not abuse the site, scrape in a way that harms publishers, or use JoyPulse to redistribute content in violation
        of others&apos; rights. Newsletter signup must use an email you control.
      </p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, JoyPulse and its operators are not liable for any indirect or consequential
        loss arising from use of the site or reliance on curated headlines.
      </p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Changes</h2>
      <p>
        We may update these terms from time to time. Continued use after changes means you accept the updated terms.
      </p>

      <h2 className="text-lg font-bold text-slate-900 pt-2">Contact</h2>
      <p>
        Questions:{" "}
        <a href="mailto:joypulse.support@proton.me" className="text-amber-700 font-semibold hover:underline">
          joypulse.support@proton.me
        </a>
      </p>
    </LegalShell>
  );
}
