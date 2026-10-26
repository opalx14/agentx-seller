import Link from "next/link";
import { ArrowLeft, Store } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f7f4]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/store" className="flex min-h-11 items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white"><Store className="size-5" /></div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-slate-950">OpalX Market</div>
              <div className="text-[11px] text-slate-400">Help & orders</div>
            </div>
          </Link>
          <Link href="/store" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950">
            <ArrowLeft className="size-3.5" /> Back to shop
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
