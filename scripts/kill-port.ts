import { spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const rawPort = process.argv[2] ?? process.env.PORT ?? "3000";
const port = Number(rawPort);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error(`[kill-port] Invalid port: ${rawPort}`);
  process.exit(1);
}

const lookup = spawnSync("lsof", ["-ti", `tcp:${port}`], { encoding: "utf8" });
if (lookup.error && (lookup.error as NodeJS.ErrnoException).code === "ENOENT") {
  console.error("[kill-port] lsof is required on this local environment.");
  process.exit(1);
}

const pids = lookup.stdout
  .split(/\s+/)
  .map((value: string) => Number(value))
  .filter((pid: number) => Number.isInteger(pid) && pid > 0 && pid !== process.pid);

if (pids.length === 0) {
  console.log(`[kill-port] Port ${port} is free.`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    process.kill(pid, "SIGTERM");
    console.log(`[kill-port] Sent SIGTERM to PID ${pid} on port ${port}.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

await delay(250);

for (const pid of pids) {
  try {
    process.kill(pid, 0);
    process.kill(pid, "SIGKILL");
    console.log(`[kill-port] Forced PID ${pid} to stop.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

console.log(`[kill-port] Port ${port} is ready.`);
