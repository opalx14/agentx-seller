"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, Minus, Plus, ShoppingBag, Star, X } from "lucide-react";
import { ProductVisual } from "@/components/store/product-visual";
import type { StorefrontCatalog } from "@/features/storefront/catalog";
import type { StorefrontCheckoutResult } from "@/features/storefront/checkout";

type CartState = Record<string, number>;

function money(value: number) {
  return `${value.toLocaleString("vi-VN")}₫`;
}

export function Storefront({ catalog, initialProductId }: { catalog: StorefrontCatalog; initialProductId?: string }) {
  const validInitial = initialProductId && catalog.products.some((product) => product.id === initialProductId)
    ? initialProductId
    : undefined;
  const [cart, setCart] = useState<CartState>(validInitial ? { [validInitial]: 1 } : {});
  const [cartOpen, setCartOpen] = useState(Boolean(validInitial));
  const [customerName, setCustomerName] = useState("Demo Buyer");
  const [phone, setPhone] = useState("+84909990001");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StorefrontCheckoutResult | null>(null);

  const cartLines = useMemo(() => catalog.products
    .filter((product) => (cart[product.id] ?? 0) > 0)
    .map((product) => ({ product, quantity: cart[product.id] ?? 0 })), [cart, catalog.products]);
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);
  const total = cartLines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const displayProducts = ["P006", "P002", "P003"]
    .map((id) => catalog.products.find((product) => product.id === id))
    .filter((product): product is StorefrontCatalog["products"][number] => Boolean(product));
  const heroProduct = displayProducts.find((product) => product.id === "P002") ?? displayProducts[0] ?? catalog.products[0];

  function add(productId: string) {
    setResult(null);
    setError(null);
    setCart((current) => ({ ...current, [productId]: Math.min(5, (current[productId] ?? 0) + 1) }));
    setCartOpen(true);
    if (productId === "P002") window.dispatchEvent(new Event("agentx:tour:product-added"));
  }

  function setQuantity(productId: string, quantity: number) {
    setResult(null);
    setError(null);
    setCart((current) => {
      const next = { ...current };
      if (quantity <= 0) delete next[productId];
      else next[productId] = Math.min(5, quantity);
      return next;
    });
  }

  async function checkout(event: FormEvent) {
    event.preventDefault();
    if (!cartLines.length || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          phone,
          items: cartLines.map(({ product, quantity }) => ({ productId: product.id, quantity })),
        }),
      });
      const data = await response.json() as { result?: StorefrontCheckoutResult; error?: string };
      if (!response.ok || !data.result) throw new Error(data.error ?? "Checkout failed");
      setResult(data.result);
      setCart({});
      window.localStorage.setItem("agentx:store:customerId", data.result.customerId);
      window.dispatchEvent(new CustomEvent("agentx:store-session", { detail: { customerId: data.result.customerId } }));
      window.dispatchEvent(new Event("agentx:tour:checkout-complete"));
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Checkout failed";
      setError(message === "INVALID_PHONE" ? "Use an international phone number, for example +84901234567." : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="bg-slate-950 px-4 py-2 text-center text-[11px] font-medium text-white">Free delivery on orders over 500.000₫ · 7-day returns</div>

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/store" className="text-lg font-semibold tracking-tight">OpalX Market</Link>
          <nav className="flex items-center gap-2">
            <a href="#products" className="hidden min-h-10 items-center px-3 text-sm font-medium text-slate-600 hover:text-slate-950 sm:inline-flex">Shop</a>
            <button type="button" onClick={() => window.dispatchEvent(new Event("agentx:open-support"))} className="hidden min-h-10 items-center px-3 text-sm font-medium text-slate-600 hover:text-slate-950 sm:inline-flex">Support</button>
            <button type="button" onClick={() => setCartOpen(true)} className="relative inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50" aria-label={`Open cart with ${itemCount} items`}>
              <ShoppingBag className="size-4" /> Cart
              {itemCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-slate-950 text-[10px] text-white">{itemCount}</span>}
            </button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
        <div className="grid overflow-hidden rounded-[28px] bg-[#f3f1eb] lg:grid-cols-[1.05fr_.95fr]">
          <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Everyday essentials</div>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-[-0.045em] sm:text-5xl lg:text-6xl">Simple products. Straightforward support.</h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">Three demo products cover the core post-purchase cases: routine refunds, high-value review and returns.</p>
            <a href="#products" className="mt-7 inline-flex min-h-12 w-fit items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Shop collection <ArrowRight className="size-4" /></a>
          </div>
          <div className="min-h-[280px] bg-white/40 lg:min-h-[460px]">
            <ProductVisual product={heroProduct} />
          </div>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Shop</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Featured products</h2>
          </div>
          <div className="text-sm text-slate-400">{displayProducts.length} items</div>
        </div>

        <div className="mt-7 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {displayProducts.map((product) => (
            <article key={product.id} className="group">
              <Link href={`/store/products/${product.id}`} className="block overflow-hidden rounded-2xl bg-[#f6f5f2]">
                <ProductVisual product={product} compact />
              </Link>
              <div className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400">{product.category}</div>
                    <Link href={`/store/products/${product.id}`} className="mt-1 block truncate text-base font-semibold hover:underline">{product.name}</Link>
                  </div>
                  <div className="shrink-0 text-sm font-semibold">{money(product.price)}</div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1 text-xs text-slate-500"><Star className="size-3.5 fill-amber-400 text-amber-400" /> {product.rating} <span className="text-slate-300">·</span> {product.reviewCount}</div>
                  <span className="text-xs text-slate-400 line-through">{money(product.compareAtPrice)}</span>
                </div>
                <button type="button" data-tour={product.id === "P002" ? "store-add-P002" : undefined} onClick={() => add(product.id)} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">Add to cart</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>OpalX Market · Demo storefront</div>
          <div>No real payment is collected.</div>
        </div>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <button type="button" aria-label="Close cart" className="absolute inset-0 bg-slate-950/30 backdrop-blur-[1px]" onClick={() => setCartOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-[430px] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div><div className="text-lg font-semibold">Your cart</div><div className="text-xs text-slate-400">{result ? "Order confirmed" : `${itemCount} item${itemCount === 1 ? "" : "s"}`}</div></div>
              <button type="button" onClick={() => setCartOpen(false)} className="grid size-11 place-items-center rounded-full hover:bg-slate-100" aria-label="Close cart"><X className="size-5" /></button>
            </div>

            {result ? (
              <div className="flex flex-1 flex-col overflow-y-auto p-5">
                <div className="grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Check className="size-6" /></div>
                <div className="mt-5 text-sm font-semibold text-emerald-700">Order confirmed</div>
                <div className="mt-1 text-3xl font-semibold tracking-tight">{result.orderId}</div>
                <p className="mt-3 text-sm leading-6 text-slate-500">Your demo order is ready and shipment tracking has been created.</p>
                <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200 px-4 text-sm">
                  <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Customer</span><span className="font-semibold text-right">{result.customerName}</span></div>
                  <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Total</span><span className="font-semibold">{money(result.totalAmount)}</span></div>
                  <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Carrier</span><span className="font-semibold">{result.shipment.carrier}</span></div>
                  <div className="flex justify-between gap-4 py-3"><span className="text-slate-500">Tracking</span><span className="font-mono text-xs font-semibold">{result.shipment.trackingNumber}</span></div>
                </div>
                <div className="mt-6 grid gap-2">
                  <button type="button" data-tour="store-open-support" onClick={() => { setCartOpen(false); window.dispatchEvent(new Event("agentx:open-support")); window.dispatchEvent(new Event("agentx:tour:support-opened")); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white">Ask AgentX about this order <ArrowRight className="size-4" /></button>
                  <a href={`/api/integrations/telegram/link?customerId=${encodeURIComponent(result.customerId)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 px-4 text-sm font-semibold">Connect Telegram</a>
                </div>
                <button type="button" onClick={() => { setResult(null); setCartOpen(false); }} className="mt-4 min-h-11 text-sm font-medium text-slate-500">Continue shopping</button>
              </div>
            ) : (
              <form onSubmit={checkout} className="flex min-h-0 flex-1 flex-col">
                <div className="flex-1 overflow-y-auto p-5">
                  {cartLines.length === 0 ? (
                    <div className="grid min-h-[280px] place-items-center text-center">
                      <div><ShoppingBag className="mx-auto size-8 text-slate-300" /><div className="mt-4 font-semibold">Your cart is empty</div><div className="mt-1 text-sm text-slate-400">Add a product to get started.</div></div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {cartLines.map(({ product, quantity }) => (
                        <div key={product.id} className="flex gap-4">
                          <div className="w-24 shrink-0 overflow-hidden rounded-xl bg-[#f6f5f2]"><ProductVisual product={product} compact /></div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-slate-400">{product.category}</div>
                            <div className="mt-1 truncate text-sm font-semibold">{product.name}</div>
                            <div className="mt-1 text-sm">{money(product.price)}</div>
                            <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 p-1">
                              <button type="button" onClick={() => setQuantity(product.id, quantity - 1)} className="grid size-9 place-items-center rounded-full hover:bg-slate-100" aria-label={`Decrease ${product.name}`}><Minus className="size-3.5" /></button>
                              <span className="min-w-8 text-center text-sm font-semibold">{quantity}</span>
                              <button type="button" onClick={() => setQuantity(product.id, quantity + 1)} className="grid size-9 place-items-center rounded-full hover:bg-slate-100" aria-label={`Increase ${product.name}`}><Plus className="size-3.5" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {cartLines.length > 0 && (
                    <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
                      <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Subtotal</span><span className="text-lg font-semibold">{money(total)}</span></div>
                      <label className="block"><span className="text-xs font-semibold text-slate-500">Name</span><input value={customerName} onChange={(event) => setCustomerName(event.target.value)} maxLength={80} autoComplete="name" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" /></label>
                      <label className="block"><span className="text-xs font-semibold text-slate-500">Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="+84901234567" className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" /></label>
                      {error && <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{error}</div>}
                    </div>
                  )}
                </div>

                {cartLines.length > 0 && (
                  <div className="border-t border-slate-200 p-5">
                    <button data-tour="store-checkout" disabled={submitting} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white disabled:opacity-50">{submitting ? <Loader2 className="size-4 animate-spin" /> : <ShoppingBag className="size-4" />} Place demo order · {money(total)}</button>
                    <div className="mt-3 text-center text-[11px] text-slate-400">Demo checkout only · no real payment</div>
                  </div>
                )}
              </form>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
