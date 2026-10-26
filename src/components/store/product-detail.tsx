import Link from "next/link";
import { ArrowLeft, Check, ShoppingBag, Star, Truck } from "lucide-react";
import { ProductVisual } from "@/components/store/product-visual";
import type { StorefrontProduct } from "@/features/storefront/catalog";

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}₫`;
}

export function ProductDetail({ product }: { product: StorefrontProduct }) {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="bg-slate-950 px-4 py-2 text-center text-[11px] font-medium text-white">Free delivery on orders over 500.000₫ · 7-day returns</div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/store" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" /> OpalX Market</Link>
          <Link href={`/store?product=${encodeURIComponent(product.id)}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold"><ShoppingBag className="size-4" /> Add to cart</Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="overflow-hidden rounded-[28px] bg-[#f6f5f2]"><ProductVisual product={product} /></div>
          <div className="flex flex-col justify-center lg:py-8">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{product.category}</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Star className="size-4 fill-amber-400 text-amber-400" /><span className="font-semibold text-slate-950">{product.rating}</span><span>· {product.reviewCount} reviews</span></div>

            <div className="mt-7 flex items-end gap-3"><span className="text-3xl font-semibold">{money(product.price)}</span><span className="pb-1 text-sm text-slate-400 line-through">{money(product.compareAtPrice)}</span></div>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-600">{product.description}</p>

            <div className="mt-7 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4 text-sm">
              <div className="flex items-center gap-3 py-4"><Truck className="size-4 text-slate-500" /><div><div className="font-semibold">{product.shippingLabel}</div><div className="mt-0.5 text-xs text-slate-400">Tracking included after checkout</div></div></div>
              <div className="flex items-center gap-3 py-4"><Check className="size-4 text-slate-500" /><div><div className="font-semibold">7-day returns</div><div className="mt-0.5 text-xs text-slate-400">Available after delivery</div></div></div>
            </div>

            <div className="mt-5 text-sm font-medium text-emerald-700">{product.stockLabel}</div>
            <Link href={`/store?product=${encodeURIComponent(product.id)}`} className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 text-base font-semibold text-white sm:w-auto sm:min-w-[280px]"><ShoppingBag className="size-5" /> Add to cart · {money(product.price)}</Link>
            <p className="mt-4 text-xs text-slate-400">Demo checkout only. No real payment is collected.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
