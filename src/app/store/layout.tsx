import { StoreSupportWidget } from "@/components/store/support-widget";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <StoreSupportWidget />
    </>
  );
}
