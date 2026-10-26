import { describe, expect, test } from "bun:test";
import clientUi from "@/data/mock/client-ui.json";
import store from "@/data/mock/store.json";
import { demoStore } from "@/lib/mock-store";

describe("JSON-backed mock data", () => {
  test("loads deterministic commerce seed data from JSON", () => {
    expect(store.customers).toHaveLength(3);
    expect(store.orders.map((order) => order.id)).toEqual(["A1001", "A1002", "A1003"]);
    expect(store.shipments.find((shipment) => shipment.orderId === "A1001")?.carrier).toBe("GHN");
    expect(store.policy).toEqual({ autoRefundLimit: 500000, returnWindowDays: 7 });
  });

  test("runtime store clones JSON seed instead of sharing mutable objects", () => {
    expect(demoStore.customers).not.toBe(store.customers);
    expect(demoStore.orders).not.toBe(store.orders);
    expect(demoStore.conversations).not.toBe(store.conversations);
    expect(demoStore.orders[0]?.id).toBe(store.orders[0]?.id);
  });

  test("client demo prompts are JSON-backed", () => {
    expect(clientUi.quickPrompts).toContain("Where is my order A1001?");
    expect(clientUi.quickPrompts).toHaveLength(4);
  });
});
