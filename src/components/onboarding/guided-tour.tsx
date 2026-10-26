"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HelpCircle, X } from "lucide-react";
import onboarding from "@/data/demo/onboarding.json";

type TourStep = {
  id: string;
  routePrefix: string;
  target: string;
  title: string;
  description: string;
  advanceEvent: string;
};

type Rect = { top: number; left: number; right: number; bottom: number; width: number; height: number };

const STEP_KEY = "agentx:onboarding:step";
const steps = onboarding.steps as TourStep[];

function currentStepIndex() {
  if (typeof window === "undefined") return 0;
  const value = Number(window.localStorage.getItem(STEP_KEY) ?? "0");
  return Number.isInteger(value) && value >= 0 && value < steps.length ? value : 0;
}

export function GuidedTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const step = steps[index];

  const finish = useCallback(() => {
    window.localStorage.setItem(onboarding.storageKey, "true");
    window.localStorage.removeItem(STEP_KEY);
    setActive(false);
    setRect(null);
  }, []);

  const advance = useCallback(() => {
    const next = index + 1;
    if (next >= steps.length) {
      finish();
      return;
    }

    const nextStep = steps[next];
    window.localStorage.setItem(STEP_KEY, String(next));
    setIndex(next);

    if (!window.location.pathname.startsWith(nextStep.routePrefix)) {
      router.push(nextStep.routePrefix);
    }
  }, [finish, index, router]);

  const start = useCallback(() => {
    window.localStorage.removeItem(onboarding.storageKey);
    window.localStorage.setItem(STEP_KEY, "0");
    setIndex(0);
    setActive(true);
    if (!window.location.pathname.startsWith(steps[0].routePrefix)) router.push(steps[0].routePrefix);
  }, [router]);

  useEffect(() => {
    const completed = window.localStorage.getItem(onboarding.storageKey) === "true";
    const nextIndex = currentStepIndex();
    const nextStep = steps[nextIndex];
    queueMicrotask(() => {
      setIndex(nextIndex);
      setActive(!completed && Boolean(nextStep) && pathname.startsWith(nextStep.routePrefix));
    });
  }, [pathname]);

  useEffect(() => {
    if (!active || !step) return;
    const handleAdvance = () => advance();
    window.addEventListener(step.advanceEvent, handleAdvance);
    return () => window.removeEventListener(step.advanceEvent, handleAdvance);
  }, [active, advance, step]);

  useEffect(() => {
    if (!active || !step || !pathname.startsWith(step.routePrefix)) {
      queueMicrotask(() => setRect(null));
      return;
    }

    let frame = 0;
    const initialTarget = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    initialTarget?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
        if (!target) {
          setRect(null);
          return;
        }
        const next = target.getBoundingClientRect();
        setRect({ top: next.top, left: next.left, right: next.right, bottom: next.bottom, width: next.width, height: next.height });
      });
    };

    const settleTimer = window.setTimeout(update, 320);
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [active, pathname, step]);

  const coachStyle = useMemo(() => {
    if (!rect) return undefined;
    const width = Math.min(320, window.innerWidth - 32);
    const preferBelow = rect.bottom + 180 < window.innerHeight;
    const top = preferBelow ? rect.bottom + 14 : Math.max(16, rect.top - 170);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    return { top, left, width };
  }, [rect]);

  return (
    <>
      {(pathname.startsWith("/store") || pathname.startsWith("/hub")) && !active && (
        <button type="button" onClick={start} className="fixed bottom-5 left-4 z-[70] inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 shadow-lg hover:bg-slate-50 sm:bottom-6 sm:left-6">
          <HelpCircle className="size-4" /> Demo guide
        </button>
      )}

      {active && step && pathname.startsWith(step.routePrefix) && rect && (
        <div className="fixed inset-0 z-[100] pointer-events-none" aria-live="polite">
          <div className="pointer-events-auto fixed left-0 top-0 bg-slate-950/55 backdrop-blur-[2px]" style={{ width: "100%", height: Math.max(0, rect.top - 8) }} />
          <div className="pointer-events-auto fixed left-0 bg-slate-950/55 backdrop-blur-[2px]" style={{ top: Math.max(0, rect.top - 8), width: Math.max(0, rect.left - 8), height: rect.height + 16 }} />
          <div className="pointer-events-auto fixed right-0 bg-slate-950/55 backdrop-blur-[2px]" style={{ top: Math.max(0, rect.top - 8), width: Math.max(0, window.innerWidth - rect.right - 8), height: rect.height + 16 }} />
          <div className="pointer-events-auto fixed bottom-0 left-0 bg-slate-950/55 backdrop-blur-[2px]" style={{ top: rect.bottom + 8, width: "100%" }} />
          <div className="fixed rounded-2xl ring-4 ring-white/95 shadow-[0_0_0_4px_rgba(15,23,42,0.3)]" style={{ top: rect.top - 5, left: rect.left - 5, width: rect.width + 10, height: rect.height + 10 }} />

          {coachStyle && (
            <div className="pointer-events-auto fixed rounded-2xl border border-white/15 bg-slate-950 p-4 text-white shadow-2xl" style={coachStyle}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Step {index + 1} of {steps.length}</div>
                  <div className="mt-1 text-sm font-semibold">{step.title}</div>
                </div>
                <button type="button" onClick={finish} className="grid size-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close demo guide"><X className="size-4" /></button>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-300">{step.description}</p>
              <div className="mt-3 text-[10px] font-medium text-slate-500">Click the highlighted control to continue.</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
