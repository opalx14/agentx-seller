import { SurfaceNavigation } from "@/components/surface-navigation";

const nav = [
  { href: "/shop", label: "Overview", icon: "overview" as const },
  { href: "/shop/inbox", label: "Inbox", icon: "inbox" as const },
  { href: "/shop/orders", label: "Orders", icon: "orders" as const },
  { href: "/shop/approvals", label: "Approvals", icon: "approvals" as const },
];

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <SurfaceNavigation surface="shop" title="AgentX Shop" subtitle="Seller support workspace" nav={nav} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
