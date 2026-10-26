import { afterEach, describe, expect, test } from "bun:test";
import storefrontSeed from "@/data/mock/storefront.json";
import { demoStore } from "@/lib/mock-store";
import { getRuntimeOrder, getRuntimeShipment } from "@/lib/repository";
import { checkoutStorefront } from "@/features/storefront/checkout";

const createdOrderIds: string[] = [];
const createdCustomerIds: string[] = [];

afterEach(() => {
  for (const orderId of createdOrderIds.splice(0)) {
    const orderIndex = demoStore.orders.findIndex((order) => order.id === orderId);
    if (orderIndex >= 0) demoStore.orders.splice(orderIndex, 1);
    const shipmentIndex = demoStore.shipments.findIndex((shipment) => shipment.orderId === orderId);
    if (shipmentIndex >= 0) demoStore.shipments.splice(shipmentIndex, 1);
  }
  for (const customerId of createdCustomerIds.splice(0)) {
    const customerIndex = demoStore.customers.findIndex((customer) => customer.id === customerId);
    if (customerIndex >= 0) demoStore.customers.splice(customerIndex, 1);
  }
  for (let index = demoStore.audit.length - 1; index >= 0; index -= 1) {
    if (demoStore.audit[index]?.action === "demo_order_created") demoStore.audit.splice(index, 1);
  }
});

describe("Storefront demo checkout", () => {
  test("catalog is JSON-backed and exposes support-oriented demo products", () => {
    expect(storefrontSeed.products.length).toBeGreaterThanOrEqual(3);
    expect(storefrontSeed.products.some((product) => product.price <= 500000)).toBe(true);
    expect(storefrontSeed.products.some((product) => product.price > 500000)).toBe(true);
    expect(storefrontSeed.products.some((product) => product.category === "Footwear")).toBe(true);
    expect(storefrontSeed.products.every((product) => product.rating > 0 && product.reviewCount > 0)).toBe(true);
    expect(storefrontSeed.products.every((product) => product.imageUrl.startsWith("https://images.unsplash.com/"))).toBe(true);
    expect(storefrontSeed.products.every((product) => product.imageAlt.length > 0)).toBe(true);
    expect(storefrontSeed.store.notice).toContain("no real payment");
  });

  test("server-side checkout computes catalog total and creates a supportable runtime order", async () => {
    const result = await checkoutStorefront({
      customerName: "Storefront Test Buyer",
      phone: "+84907771234",
      items: [
        { productId: "P001", quantity: 1 },
        { productId: "P003", quantity: 2 },
      ],
    });
    createdOrderIds.push(result.orderId);
    createdCustomerIds.push(result.customerId);

    expect(result.totalAmount).toBe(1_050_000);
    expect(result.orderId).toMatch(/^A\d{4}$/);
    expect(result.shipment.carrier).toBe("GHN");
    expect(result.shipment.status).toBe("in_transit");

    const order = await getRuntimeOrder(result.orderId);
    const shipment = await getRuntimeShipment(result.orderId);
    expect(order?.customerId).toBe(result.customerId);
    expect(order?.totalAmount).toBe(1_050_000);
    expect(order?.status).toBe("shipped");
    expect(shipment?.trackingNumber).toBe(`GHN-${result.orderId}`);
  });

  test("rejects product ids and quantities that are not in the demo catalog", async () => {
    await expect(checkoutStorefront({
      customerName: "Storefront Test Buyer",
      phone: "+84907771235",
      items: [{ productId: "P999", quantity: 1 }],
    })).rejects.toThrow("PRODUCT_NOT_FOUND");

    await expect(checkoutStorefront({
      customerName: "Storefront Test Buyer",
      phone: "+84907771235",
      items: [{ productId: "P001", quantity: 99 }],
    })).rejects.toThrow("INVALID_QUANTITY");
  });
});
