#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const [, , appName, command, ...args] = process.argv;

if (!appName || !command) {
  console.error(
    "Usage: node scripts/with-app-env.mjs <app-name> <command> [args...]",
  );
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.resolve(here, "..", "ecosystem.config.cjs");

let config;
try {
  config = require(configPath);
} catch (err) {
  console.error(`Failed to load ${configPath}:`, err.message);
  process.exit(1);
}

const app = (config.apps ?? []).find((a) => a.name === appName);
if (!app) {
  console.error(
    `App '${appName}' not found in ecosystem.config.cjs. ` +
      `Available: ${(config.apps ?? []).map((a) => a.name).join(", ")}`,
  );
  process.exit(1);
}

const env = { ...process.env, ...(app.env ?? {}) };

const child = spawn(command, args, {
  stdio: "inherit",
  env,
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => child.kill(sig));
}
