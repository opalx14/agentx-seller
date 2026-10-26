"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeftRight,
  Bot,
  ClipboardCheck,
  Gauge,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessagesSquare,
  PackageSearch,
  ScrollText,
  ShieldCheck,
  Store,
} from "lucide-react";

type IconName = "overview" | "inbox" | "orders" | "approvals" | "conversations" | "policies" | "time-machine" | "red-team" | "incidents" | "scenarios" | "audit" | "runtime";
type NavItem = { href: string; label: string; icon: IconName };

type SurfaceNavigationProps = {
  surface: "shop" | "hub";
  title: string;
  subtitle: string;
  nav: NavItem[];
};

const iconMap = {
  overview: LayoutDashboard,
  inbox: Inbox,
  orders: PackageSearch,
  approvals: ClipboardCheck,
  conversations: MessagesSquare,
  policies: Gauge,
  "time-machine": ArrowLeftRight,
  "red-team": ShieldCheck,
  incidents: Activity,
  scenarios: ListChecks,
  audit: ScrollText,
  runtime: Activity,
};

const surfaceMeta = {
  shop: { icon: Store, accent: "from-emerald-300 via-teal-400 to-cyan-500", status: "Seller workspace" },
  hub: { icon: Bot, accent: "from-cyan-300 via-sky-400 to-indigo-500", status: "Control plane" },
};

function NavLinks({ nav, mobile = false }: { nav: NavItem[]; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={mobile ? "flex min-w-max gap-1" : "space-y-1.5"}>
      {nav.map(({ href, label, icon }) => {
        const Icon = iconMap[icon];
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "group flex items-center gap-3 text-sm font-medium transition",
              mobile ? "min-h-10 shrink-0 snap-start whitespace-nowrap rounded-xl px-3 py-2" : "rounded-xl px-3 py-2.5",
              active
                ? mobile
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-950 shadow-[0_8px_30px_rgba(15,23,42,0.14)]"
                : mobile
                  ? "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                  : "text-slate-400 hover:bg-white/[0.07] hover:text-white",
            ].join(" ")}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SurfaceNavigation({ surface, title, subtitle, nav }: SurfaceNavigationProps) {
  const meta = surfaceMeta[surface];
  const Icon = meta.icon;
  const otherHref = surface === "shop" ? "/hub" : "/shop";
  const otherLabel = surface === "shop" ? "Open Hub" : "Open Shop";

  return (
    <>
      <aside className="hidden min-h-screen flex-col border-r border-white/8 bg-[#08101c] px-4 py-5 text-white lg:flex">
        <Link href={`/${surface}`} className="flex items-center gap-3 px-2 py-1">
          <div className={`grid size-10 place-items-center rounded-xl bg-gradient-to-br ${meta.accent} text-slate-950 shadow-lg shadow-black/20`}>
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight text-white">{title}</div>
            <div className="truncate text-[11px] text-slate-500">{subtitle}</div>
          </div>
        </Link>

        <div className="mt-8">
          <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Workspace</div>
          <NavLinks nav={nav} />
        </div>

        <div className="mt-auto space-y-3">
          <Link href={otherHref} className="flex min-h-10 items-center justify-between rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2.5 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
            <span className="flex items-center gap-2"><ArrowLeftRight className="size-3.5" /> {otherLabel}</span>
            <span>↗</span>
          </Link>
          <Link href="/client" className="flex min-h-10 items-center justify-between rounded-xl border border-white/8 bg-white/[0.045] px-3 py-2.5 text-xs text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
            <span className="flex items-center gap-2"><ShieldCheck className="size-3.5" /> Client view</span>
            <span>↗</span>
          </Link>
          <div className="px-2 text-[10px] uppercase tracking-[0.18em] text-slate-700">{meta.status} · AgentX</div>
        </div>
      </aside>

      <div className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href={`/${surface}`} className="flex min-h-11 min-w-0 items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white"><Icon className="size-4" /></div>
            <div className="min-w-0"><div className="truncate text-sm font-semibold tracking-tight">{title}</div><div className="truncate text-[10px] text-slate-400">{subtitle}</div></div>
          </Link>
          <Link href={otherHref} className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600">Switch</Link>
        </div>
        <div className="snap-x overflow-x-auto px-3 pb-3 scrollbar-none"><NavLinks nav={nav} mobile /></div>
      </div>
    </>
  );
}
