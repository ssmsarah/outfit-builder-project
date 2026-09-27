// Shared in-memory MongoDB test harness (mongodb-memory-server + Mongoose).
// Used by any test that needs to verify real persistence/query behavior
// against an actual Mongo engine - not mocks - without touching the real
// Atlas cluster in server/.env. Reused across T3.x/T4.x DB-backed tests.
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod;

export async function connectTestDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function disconnectTestDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

export async function clearTestDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
