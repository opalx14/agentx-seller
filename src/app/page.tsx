import Link from "next/link";
import { ArrowRight, Bot, CheckCircle2, ShieldCheck, ShoppingBag } from "lucide-react";

const layers = [
  {
    step: "01",
    title: "Store",
    description: "Create a real demo order in a simple customer storefront.",
    detail: "Products · Checkout · Order + shipment",
    icon: ShoppingBag,
  },
  {
    step: "02",
    title: "Agent",
    description: "AgentX lives inside the store and handles tracking, returns and refunds with verified tools.",
    detail: "Gemini · Tools · Seller guardrails",
    icon: Bot,
  },
  {
    step: "03",
    title: "Hub",
    description: "Seller sees exactly where autonomy stopped, reviews high-risk actions and audits every decision.",
    detail: "Human approval · Policy · Audit",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <header className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold tracking-tight">AgentX Seller Support</div>
            <div className="mt-0.5 text-[11px] text-slate-400">PS-04 · Autonomous support agent for online sellers</div>
          </div>
          <Link href="/hub" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-950">
            Seller Hub <ArrowRight className="size-3.5" />
          </Link>
        </header>

        <section className="mt-16 max-w-4xl sm:mt-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="size-3.5" /> Built around the Track 04 must-haves
          </div>
          <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Gemini handles the conversation. Seller policy controls the money.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
            One focused post-purchase flow: a customer buys from the store, AgentX resolves routine support with real tools, and the Hub takes over only when seller approval is required.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/store" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10">
              Start the demo <ArrowRight className="size-4" />
            </Link>
            <Link href="/hub" className="inline-flex min-h-12 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700">
              Open seller Hub
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 lg:mt-24 lg:grid-cols-3">
          {layers.map(({ step, title, description, detail, icon: Icon }) => (
            <article key={title} className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.05)] sm:p-7">
              <div className="flex items-center justify-between">
                <div className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white"><Icon className="size-5" /></div>
                <span className="font-mono text-xs text-slate-300">{step}</span>
              </div>
              <h2 className="mt-8 text-2xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 min-h-20 text-sm leading-6 text-slate-500">{description}</p>
              <div className="mt-6 border-t border-slate-100 pt-4 text-xs font-medium text-slate-400">{detail}</div>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[26px] bg-slate-950 p-6 text-white sm:p-8">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Core decision path</div>
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-3 text-sm font-semibold">
            {[
              "Customer message",
              "Gemini plan",
              "Verified tool",
              "Deterministic policy",
              "Action or human review",
              "Audit",
            ].map((label, index, values) => (
              <div key={label} className="contents">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2">{label}</span>
                {index < values.length - 1 && <ArrowRight className="size-4 text-slate-600" />}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
