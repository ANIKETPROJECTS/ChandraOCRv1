import { MongoClient, type Db } from "mongodb";
import { logger } from "./logger";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(): Promise<Db> {
  if (db) return db;

  const uri = process.env["MONGODB_URI"];
  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is required but was not provided.",
    );
  }

  const dbName = process.env["MONGODB_DB"] ?? "apnaapp";

  client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 10_000,
  });

  await client.connect();
  db = client.db(dbName);

  logger.info({ dbName }, "Connected to MongoDB");
  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("MongoDB not initialized. Call connectMongo() first.");
  }
  return db;
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info("MongoDB connection closed");
  }
}
