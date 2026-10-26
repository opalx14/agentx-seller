import storefrontSeed from "@/data/mock/storefront.json";

export type StorefrontProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice: number;
  badge: string;
  visual: "shirt" | "headphones" | "runner" | "backpack" | "watch" | "speaker";
  imageUrl: string;
  imageAlt: string;
  rating: number;
  reviewCount: number;
  stockLabel: string;
  shippingLabel: string;
  description: string;
  supportHint: string;
};

export type StorefrontCatalog = {
  store: {
    name: string;
    eyebrow: string;
    headline: string;
    description: string;
    notice: string;
  };
  products: StorefrontProduct[];
};

const catalog = storefrontSeed as StorefrontCatalog;

export function getStorefrontCatalog(): StorefrontCatalog {
  return structuredClone(catalog);
}

export function getStorefrontProduct(productId: string) {
  return catalog.products.find((product) => product.id === productId);
}

export function getStorefrontCategories() {
  return Array.from(new Set(catalog.products.map((product) => product.category)));
}
