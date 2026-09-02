import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'mifotra';

if (!uri) throw new Error('MONGODB_URI is not set');

// Serverless functions are re-invoked constantly; cache the client on the global
// object so each cold start does not open a new connection pool.
const globalForMongo = globalThis as unknown as { _mongo?: Promise<MongoClient> };

const clientPromise =
  globalForMongo._mongo ?? (globalForMongo._mongo = new MongoClient(uri).connect());

export async function getDb(): Promise<Db> {
  return (await clientPromise).db(dbName);
}

export type AccessCode = {
  codeHash: string;
  bankId: number;
  createdAt: Date;
  note?: string;
  redeemedAt?: Date | null;
  redeemedDevice?: string | null;
  revoked?: boolean;
};

export type PaidQuestion = {
  id: string;
  slug: string;
  bankId: number;
  topic: string;
  marks: number;
  difficulty: string;
  examSource: string;
  answerIndex: number;
  bilingual: boolean;
  en: { stem: string; options: string[]; explanation: string };
  fr: { stem: string; options: string[]; explanation: string } | null;
};

export async function ensureIndexes() {
  const db = await getDb();
  await db.collection('access_codes').createIndex({ codeHash: 1 }, { unique: true });
  await db.collection('questions').createIndex({ bankId: 1 });
  await db.collection('questions').createIndex({ id: 1 }, { unique: true });
}
