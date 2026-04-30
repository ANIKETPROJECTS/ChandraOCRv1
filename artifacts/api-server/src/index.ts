import { createRequire } from "node:module";
import path from "node:path";
import { existsSync } from "node:fs";

function loadEcosystemEnv() {
  const candidates = [
    path.resolve(process.cwd(), "ecosystem.config.cjs"),
    path.resolve(process.cwd(), "../../ecosystem.config.cjs"),
  ];
  const file = candidates.find((p) => existsSync(p));
  if (!file) return;
  try {
    const req = createRequire(import.meta.url);
    const cfg = req(file) as { apps?: Array<{ name?: string; env?: Record<string, string> }> };
    const app = cfg.apps?.find((a) => a.name === "api-server");
    if (!app?.env) return;
    for (const [k, v] of Object.entries(app.env)) {
      if (process.env[k] === undefined) process.env[k] = v;
    }
  } catch {
    // ignore
  }
}

loadEcosystemEnv();

const { default: app } = await import("./app");
const { logger } = await import("./lib/logger");
const { connectMongo, closeMongo } = await import("./lib/mongo");

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start() {
  try {
    await connectMongo();
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB");
    process.exit(1);
  }

  const server = app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close();
    await closeMongo();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void start();
