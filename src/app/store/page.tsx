import { Storefront } from "@/components/store/storefront";
import { getStorefrontCatalog } from "@/features/storefront/catalog";

export const instant = false;

export default async function StorePage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product } = await searchParams;
  return <Storefront catalog={getStorefrontCatalog()} initialProductId={product} />;
}
