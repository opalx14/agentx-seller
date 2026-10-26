import { connection } from "next/server";
import { ClientPortal } from "@/components/client-portal";
import { getRuntimeConversationForCustomer, getRuntimeShipment, listRuntimeOrders } from "@/lib/repository";

export const instant = false;

export default async function ClientPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  await connection();
  const orders = await listRuntimeOrders();
  const requestedCustomerId = (await searchParams).customerId?.trim();
  const hasRequestedCustomer = Boolean(requestedCustomerId && orders.some((order) => order.customerId === requestedCustomerId));
  const customerId = hasRequestedCustomer
    ? requestedCustomerId!
    : orders[0]?.customerId ?? "";
  const customerOrders = orders.filter((order) => order.customerId === customerId);
  const shipments = Object.fromEntries(
    await Promise.all(customerOrders.map(async (order) => [order.id, await getRuntimeShipment(order.id)] as const)),
  );
  const first = customerOrders[0];
  const conversation = customerId ? await getRuntimeConversationForCustomer(customerId) : undefined;
  const testCustomers = Array.from(
    new Map(
      orders.map((order) => [
        order.customerId,
        { id: order.customerId, label: order.customerName, order: order.id },
      ]),
    ).values(),
  );

  return (
    <ClientPortal
      telegramAccountName={process.env.TELEGRAM_ACCOUNT_NAME?.trim() || "OpalX"}
      testCustomers={testCustomers}
      showDemoIdentity={!hasRequestedCustomer}
      initial={{
        customer: {
          id: customerId,
          name: first?.customerName ?? "Customer",
          phone: first?.customerPhone ?? "",
        },
        orders: customerOrders,
        shipments,
        conversation,
      }}
    />
  );
}
