import type { Metadata } from "next";
import LegalShell from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Contact Us – JoyPulse",
  description: "Contact JoyPulse support.",
};

export default function ContactPage() {
  return (
    <LegalShell title="Contact Us">
      <p>
        We&apos;d love to hear feedback, takedown requests, partnership ideas, or bug reports.
      </p>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 not-prose">
        <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">Support email</p>
        <a
          href="mailto:joypulse.support@proton.me"
          className="text-lg font-black text-slate-900 hover:text-amber-700 break-all"
        >
          joypulse.support@proton.me
        </a>
        <p className="text-sm text-slate-600 mt-2">
          We read every message. Replies may take a few days.
        </p>
      </div>

      <h2 className="text-lg font-bold text-slate-900 pt-2">What to include</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>For a story concern: headline + source link</li>
        <li>For privacy / data: which email you used to subscribe</li>
        <li>For bugs: device, browser, and what you expected to happen</li>
      </ul>

      <p className="text-sm text-slate-500 pt-2">
        JoyPulse is an independent project. We are not affiliated with the news outlets we link to.
      </p>
    </LegalShell>
  );
}
