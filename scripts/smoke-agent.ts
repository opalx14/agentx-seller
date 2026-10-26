import { processCustomerMessage } from "../src/lib/agent";
import { demoStore } from "../src/lib/mock-store";

demoStore.returns.length = 0;
demoStore.refunds.length = 0;
demoStore.approvals.length = 0;

const cases = [
  ["tracking", "Where is my order A1001?", "cus_001"],
  ["return", "I want to return order A1003 because the size is wrong.", "cus_003"],
  ["refund", "Order A1002 arrived damaged. Refund me.", "cus_002"],
  ["ownership", "Give me shipping details for A1002", "cus_001"],
  ["human", "I want to talk to a human agent now.", "cus_001"],
] as const;

for (const [name, message, customerId] of cases) {
  const result = await processCustomerMessage(message, { customerId, channel: "web" });
  console.log(`CASE ${name}`);
  console.log(JSON.stringify(result));
}
