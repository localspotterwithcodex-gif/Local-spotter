import { MongoClient, type Db } from "mongodb";

// Cached on the global object so warm Vercel serverless invocations reuse
// the same connection instead of opening a new one on every request.
const globalForMongo = globalThis as unknown as {
  __mongoClientPromise?: Promise<MongoClient> | undefined;
};

export const DB_NAME = "localspotter";
export const SHOP_REGISTRATIONS_COLLECTION = "shopRegistrations";

export function getMongoDb(): Promise<Db> {
  // Whitespace is never valid inside a MongoDB URI, but it's easy to paste
  // in by accident and shows up as a confusing "bad auth" error.
  const uri = process.env.MONGODB_URI?.replace(/\s+/g, "");
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it in your Vercel project's Environment Variables (and in frontend/.env.local for local development)."
    );
  }

  if (!globalForMongo.__mongoClientPromise) {
    globalForMongo.__mongoClientPromise = new MongoClient(uri, {
      maxPoolSize: 5,
    })
      .connect()
      .catch((err) => {
        // Don't cache a failed connection attempt — the next request should
        // retry rather than keep reusing a broken promise.
        globalForMongo.__mongoClientPromise = undefined;
        throw err;
      });
  }

  return globalForMongo.__mongoClientPromise.then((client) => client.db(DB_NAME));
}
