import Link from "next/link";
import type { ReactNode } from "react";

const ASSET = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function LegalShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-lg tracking-tight text-slate-900 hover:text-amber-600">
            <img src={`${ASSET}/icon-192.png`} alt="" width={28} height={28} className="h-7 w-7 rounded-lg" />
            JoyPulse<span className="text-amber-500">.</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-slate-500 hover:text-amber-600">
            ← Back to stories
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-6">{title}</h1>
        <div className="prose prose-slate prose-sm max-w-none space-y-4 text-[15px] leading-relaxed text-slate-700">
          {children}
        </div>
      </main>
      <footer className="border-t border-slate-200 mt-12 py-8 text-center text-sm text-slate-500">
        <p>
          <a href="mailto:joypulse.support@proton.me" className="text-amber-700 font-semibold hover:underline">
            joypulse.support@proton.me
          </a>
        </p>
        <p className="mt-2 text-xs text-slate-400">© {new Date().getFullYear()} JoyPulse</p>
      </footer>
    </div>
  );
}
