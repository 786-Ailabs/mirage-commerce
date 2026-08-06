import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedProducts } from "./seedProducts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, "miraje-store.json");

const initialData = {
  products: seedProducts,
  orders: [],
  customers: [],
  settings: {
    storeName: "N Mart",
    currency: "INR",
    deliveryFee: 35,
    freeDeliveryAbove: 499
  }
};

async function ensureDb() {
  try {
    await fs.access(dbPath);
  } catch {
    await writeDb(initialData);
  }
}

export async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(dbPath, "utf8");
  return JSON.parse(raw);
}

export async function writeDb(data) {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2), "utf8");
  return data;
}

export async function resetDb() {
  return writeDb(initialData);
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
