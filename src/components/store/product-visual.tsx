import Image from "next/image";
import type { StorefrontProduct } from "@/features/storefront/catalog";

const surfaceMap: Record<StorefrontProduct["visual"], string> = {
  shirt: "bg-[#f3efe8]",
  headphones: "bg-[#f0f2f4]",
  runner: "bg-white",
  backpack: "bg-[#f5f1ee]",
  watch: "bg-[#eef0f2]",
  speaker: "bg-[#f1f0ed]",
};

export function ProductVisual({ product, compact = false }: { product: StorefrontProduct; compact?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${surfaceMap[product.visual]} ${compact ? "aspect-[4/3]" : "min-h-[360px] sm:min-h-[460px]"}`}>
      <Image
        src={product.imageUrl}
        alt={product.imageAlt}
        fill
        sizes={compact ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" : "(max-width: 1024px) 100vw, 50vw"}
        className="object-cover transition duration-500 group-hover:scale-[1.015]"
      />
    </div>
  );
}
