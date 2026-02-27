import { MongoClient } from "mongodb";

const DB_NAME = "jewelryDB";

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Please set MONGODB_URI in environment variables.");
  }

  if (!global._mongoClientPromise || global._mongoClientUri !== uri) {
    const client = new MongoClient(uri);
    global._mongoClientUri = uri;
    global._mongoClientPromise = client.connect();
  }

  const client = await global._mongoClientPromise;
  return client.db(DB_NAME);
}
