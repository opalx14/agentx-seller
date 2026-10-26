import { SurfaceNavigation } from "@/components/surface-navigation";

const nav = [
  { href: "/hub", label: "Overview", icon: "overview" as const },
  { href: "/hub/policies", label: "Seller policy", icon: "policies" as const },
  { href: "/hub/audit", label: "Audit", icon: "audit" as const },
];

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f8fa] lg:grid lg:grid-cols-[232px_1fr]">
      <SurfaceNavigation surface="hub" title="AgentX Hub" subtitle="Seller control & review" nav={nav} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
