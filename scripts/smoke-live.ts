import { processCustomerMessage } from "../src/lib/agent";
import { demoStore } from "../src/lib/mock-store";

const cases = [
  ["tracking", "Where is order A1001 right now?", "cus_001"],
  ["refund", "Order A1002 arrived damaged. Please refund the full amount.", "cus_002"],
] as const;

for (const [name, message, customerId] of cases) {
  const result = await processCustomerMessage(message, { customerId, channel: "web" });
  console.log(`CASE ${name}`);
  console.log(JSON.stringify(result));
  const latestError = demoStore.audit.find((event) => event.action === "agent_error");
  if (latestError) console.log(`AGENT_ERROR ${latestError.detail}`);
}
