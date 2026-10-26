import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/store/product-detail";
import { getStorefrontProduct } from "@/features/storefront/catalog";

export const instant = false;

export default async function StoreProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getStorefrontProduct(id);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
