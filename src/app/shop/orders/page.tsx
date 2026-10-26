import { connection } from "next/server";
import { CheckCircle2, PackageSearch, Truck } from "lucide-react";
import { getRuntimeShipment, listRuntimeOrders } from "@/lib/repository";

export const instant = false;

export default async function ShopOrdersPage() {
  await connection();
  const orders = await listRuntimeOrders();
  const rows = await Promise.all(orders.map(async (order) => ({ order, shipment: await getRuntimeShipment(order.id) })));
  const delivered = orders.filter((order) => order.status === "delivered").length;
  const totalValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);

  return (
    <div className="mx-auto max-w-7xl">
      <div className="border-b border-slate-200 pb-6"><div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Commerce context</div><h1 className="mt-2 text-2xl font-semibold tracking-[-0.035em] sm:text-3xl">Orders</h1><p className="mt-2 text-sm leading-6 text-slate-500">The same verified order data AgentX uses when handling customer requests.</p></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><PackageSearch className="size-4 text-slate-400" /><div className="mt-4 text-2xl font-semibold">{orders.length}</div><div className="mt-1 text-xs text-slate-500">orders in support scope</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><CheckCircle2 className="size-4 text-emerald-500" /><div className="mt-4 text-2xl font-semibold">{delivered}</div><div className="mt-1 text-xs text-slate-500">delivered orders</div></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Gross value</div><div className="mt-4 text-2xl font-semibold">{totalValue.toLocaleString("vi-VN")}₫</div><div className="mt-1 text-xs text-slate-500">visible commerce context</div></div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden grid-cols-[.8fr_1.4fr_.8fr_.85fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 md:grid">
          <div>Order</div><div>Customer</div><div>Total</div><div>Status</div><div>Shipment</div>
        </div>
        {rows.map(({ order, shipment }) => (
          <div key={order.id} className="border-b border-slate-100 px-5 py-4 last:border-0 md:grid md:grid-cols-[.8fr_1.4fr_.8fr_.85fr_1fr] md:items-center md:gap-4">
            <div><div className="font-mono text-sm font-semibold">{order.id}</div><div className="mt-1 text-[10px] text-slate-400">{order.customerId}</div></div>
            <div className="mt-3 min-w-0 md:mt-0"><div className="break-words text-sm font-semibold text-slate-800">{order.customerName}</div><div className="mt-1 break-all text-xs text-slate-400">{order.customerPhone}</div></div>
            <div className="mt-3 text-sm font-semibold md:mt-0">{order.totalAmount.toLocaleString("vi-VN")}₫</div>
            <div className="mt-3 md:mt-0"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${order.status === "delivered" ? "bg-emerald-50 text-emerald-700" : order.status === "shipped" ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>{order.status}</span></div>
            <div className="mt-3 min-w-0 md:mt-0">{shipment ? <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500"><Truck className="size-3.5 shrink-0" /><span className="break-words">{shipment.carrier} · {shipment.status.replaceAll("_", " ")}</span></div> : <span className="text-xs text-slate-400">No shipment</span>}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
