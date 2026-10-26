"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ClipboardCheck, FileClock, Inbox, PackageSearch, Sparkles, Zap } from "lucide-react";

const nav = [
  { href: "/demo", label: "Live demo", icon: Sparkles },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/orders", label: "Orders", icon: PackageSearch },
  { href: "/approvals", label: "Approvals", icon: ClipboardCheck },
  { href: "/audit", label: "Audit log", icon: FileClock },
];

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={mobile ? "flex min-w-max gap-1" : "space-y-1.5"}>
      {nav.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "group flex items-center gap-3 text-sm font-medium transition",
              mobile ? "rounded-xl px-3 py-2" : "rounded-xl px-3 py-2.5",
              active
                ? mobile
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-950 shadow-[0_8px_30px_rgba(15,23,42,0.14)]"
                : mobile
                  ? "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                  : "text-slate-400 hover:bg-white/[0.07] hover:text-white",
            ].join(" ")}
          >
            <Icon className={active ? "size-4" : "size-4 opacity-80 transition group-hover:opacity-100"} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNavigation() {
  return (
    <>
      <aside className="hidden min-h-screen flex-col border-r border-white/8 bg-[#0a1020] px-4 py-5 text-white lg:flex">
        <Link href="/demo" className="flex items-center gap-3 px-2 py-1">
          <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-500 text-slate-950 shadow-lg shadow-cyan-950/30">
            <Bot className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-white">AgentX Support</div>
            <div className="truncate text-[11px] text-slate-500">Seller control plane</div>
          </div>
        </Link>

        <div className="mt-8">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Workspace</div>
          <NavLinks />
        </div>

        <div className="mt-auto space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/[0.045] p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
                </span>
                Control plane online
              </div>
              <Zap className="size-3.5 text-cyan-300" />
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">Gemini can request actions. Policy and ownership checks keep execution deterministic.</p>
          </div>
          <div className="px-2 text-[10px] uppercase tracking-[0.18em] text-slate-700">Track 04 · Seller support</div>
        </div>
      </aside>

      <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/demo" className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white">
              <Bot className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">AgentX Support</div>
              <div className="text-[10px] text-slate-400">Seller control plane</div>
            </div>
          </Link>
          <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500" /> Online
          </div>
        </div>
        <div className="overflow-x-auto px-3 pb-3 scrollbar-none">
          <NavLinks mobile />
        </div>
      </div>
    </>
  );
}
