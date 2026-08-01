import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { makeId, readDb, resetDb, writeDb } from "./db/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 4100;
const projectRoot = path.resolve(__dirname, "..");
const uploadsRoot = path.join(projectRoot, "uploads");
const productUploadDir = path.join(uploadsRoot, "products");
const bannerUploadDir = path.join(uploadsRoot, "banners");
const frontendDist = path.join(projectRoot, "frontend", "dist");

for (const dir of [productUploadDir, bannerUploadDir]) fs.mkdirSync(dir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, _file, cb) { cb(null, req.params.kind === "banner" ? bannerUploadDir : productUploadDir); },
  filename(_req, file, cb) {
    const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    cb(null, `${Date.now()}-${safeBase}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image uploads are allowed."));
    cb(null, true);
  }
});

app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(uploadsRoot));
if (fs.existsSync(frontendDist)) app.use(express.static(frontendDist));

const orderStatuses = ["Draft", "Accepted", "Packed", "Out for Delivery", "Delivered", "Cancelled"];

function sortByNewest(items) {
  return [...items].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function publicUploadPath(kind, filename) {
  return `/uploads/${kind === "banner" ? "banners" : "products"}/${filename}`;
}

function upsertCustomer(db, customer = {}) {
  db.customers = db.customers || [];
  const phone = String(customer.phone || "").trim();
  if (!phone) return null;
  const now = new Date().toISOString();
  const index = db.customers.findIndex((item) => item.phone === phone);
  const next = {
    id: index >= 0 ? db.customers[index].id : makeId("cus"),
    name: customer.name || db.customers[index]?.name || "Customer",
    phone,
    address: customer.address || db.customers[index]?.address || "",
    deliverySlot: customer.deliverySlot || db.customers[index]?.deliverySlot || "",
    note: customer.note || db.customers[index]?.note || "",
    orderCount: index >= 0 ? Number(db.customers[index].orderCount || 0) + 1 : 1,
    totalSpend: index >= 0 ? Number(db.customers[index].totalSpend || 0) : 0,
    lastOrderAt: now,
    createdAt: index >= 0 ? db.customers[index].createdAt : now,
    updatedAt: now
  };
  if (index >= 0) db.customers[index] = next;
  else db.customers.unshift(next);
  return next;
}

function buildStats(db) {
  const orders = db.orders || [];
  const revenue = orders.filter((order) => order.status !== "Cancelled").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const paid = orders.filter((order) => order.paymentStatus === "Paid").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const pendingPayment = orders.filter((order) => order.status !== "Cancelled" && order.paymentStatus !== "Paid").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const byStatus = orderStatuses.reduce((acc, status) => ({ ...acc, [status]: orders.filter((order) => order.status === status).length }), {});
  return { revenue, paid, pendingPayment, byStatus, products: db.products.length, orders: orders.length, customers: (db.customers || []).length };
}

app.get("/api/health", async (_req, res) => {
  const db = await readDb();
  res.json({ ok: true, service: "Miraje Grocery API", mode: "local-json-db", counts: { products: db.products.length, orders: db.orders.length, customers: (db.customers || []).length, banners: db.settings?.banners?.length || 0 } });
});

app.get("/api/catalog", async (_req, res) => {
  const db = await readDb();
  db.customers = db.customers || [];
  res.json({ products: sortByNewest(db.products), orders: sortByNewest(db.orders), customers: sortByNewest(db.customers), settings: db.settings, stats: buildStats(db) });
});

app.get("/api/customers", async (_req, res) => {
  const db = await readDb();
  res.json({ customers: sortByNewest(db.customers || []) });
});

app.get("/api/products", async (_req, res) => {
  const db = await readDb();
  res.json({ products: sortByNewest(db.products) });
});

app.post("/api/products", async (req, res) => {
  const db = await readDb();
  const product = { id: req.body.id || makeId("prd"), name: String(req.body.name || "").trim(), category: req.body.category || "General", unit: req.body.unit || "1 pc", price: Number(req.body.price || 0), mrp: Number(req.body.mrp || req.body.price || 0), stock: Number(req.body.stock || 0), tag: req.body.tag || "Fresh", image: req.body.image || String(req.body.name || "item").split(" ")[0].toLowerCase(), imagePath: req.body.imagePath || null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  if (!product.name || product.price <= 0) return res.status(400).json({ error: "Product name and valid price are required." });
  db.products = [product, ...db.products];
  await writeDb(db);
  res.status(201).json({ product, products: sortByNewest(db.products) });
});

app.patch("/api/products/:id", async (req, res) => {
  const db = await readDb();
  const index = db.products.findIndex((product) => product.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Product not found." });
  db.products[index] = { ...db.products[index], ...req.body, updatedAt: new Date().toISOString() };
  await writeDb(db);
  res.json({ product: db.products[index], products: sortByNewest(db.products) });
});

app.delete("/api/products/:id", async (req, res) => {
  const db = await readDb();
  db.products = db.products.filter((product) => product.id !== req.params.id);
  await writeDb(db);
  res.json({ ok: true, products: sortByNewest(db.products) });
});

app.get("/api/orders", async (_req, res) => {
  const db = await readDb();
  res.json({ orders: sortByNewest(db.orders) });
});

app.post("/api/orders", async (req, res) => {
  const db = await readDb();
  const requestedItems = Array.isArray(req.body.items) ? req.body.items : [];
  const stockErrors = [];

  for (const item of requestedItems) {
    const product = db.products.find((entry) => entry.id === item.id);
    if (!product) stockErrors.push(`${item.name || item.id} is no longer available.`);
    else if (Number(product.stock || 0) < Number(item.qty || 0)) stockErrors.push(`${product.name} has only ${product.stock} in stock.`);
  }

  if (stockErrors.length) return res.status(409).json({ error: "Stock validation failed.", details: stockErrors });

  const orderNumber = `MIR-${String(db.orders.length + 1).padStart(4, "0")}`;
  const customer = upsertCustomer(db, req.body.customer || {});
  const now = new Date().toISOString();
  const order = {
    id: req.body.id || orderNumber,
    items: requestedItems,
    total: Number(req.body.total || 0),
    deliveryFee: Number(req.body.deliveryFee || 0),
    customer,
    status: req.body.status || "Draft",
    paymentMode: req.body.paymentMode || "Cash on Delivery",
    paymentStatus: req.body.paymentStatus || "Pending",
    deliveryPerson: req.body.deliveryPerson || "Unassigned",
    timeline: [{ at: now, label: "Order created", detail: req.body.status || "Draft" }, { at: now, label: "Stock reserved", detail: `${requestedItems.length} line items` }],
    createdAt: now,
    updatedAt: now
  };

  for (const item of requestedItems) {
    const index = db.products.findIndex((entry) => entry.id === item.id);
    db.products[index] = { ...db.products[index], stock: Number(db.products[index].stock || 0) - Number(item.qty || 0), updatedAt: now };
  }

  if (customer) {
    const customerIndex = db.customers.findIndex((item) => item.id === customer.id);
    db.customers[customerIndex].totalSpend = Number(db.customers[customerIndex].totalSpend || 0) + order.total;
  }
  db.orders = [order, ...db.orders];
  await writeDb(db);
  res.status(201).json({ order, orders: sortByNewest(db.orders), products: sortByNewest(db.products), customers: sortByNewest(db.customers || []), stats: buildStats(db) });
});

app.patch("/api/orders/:id", async (req, res) => {
  const db = await readDb();
  const index = db.orders.findIndex((order) => order.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Order not found." });

  const now = new Date().toISOString();
  const before = db.orders[index];
  const timeline = Array.isArray(before.timeline) ? before.timeline : [];
  const changes = [];

  if (req.body.status && req.body.status !== before.status) changes.push({ at: now, label: "Status updated", detail: `${before.status} -> ${req.body.status}` });
  if (req.body.paymentStatus && req.body.paymentStatus !== before.paymentStatus) changes.push({ at: now, label: "Payment updated", detail: `${before.paymentStatus || "Pending"} -> ${req.body.paymentStatus}` });
  if (req.body.deliveryPerson && req.body.deliveryPerson !== before.deliveryPerson) changes.push({ at: now, label: "Delivery assigned", detail: req.body.deliveryPerson });

  let stockRestored = Boolean(before.stockRestored);
  if (req.body.status === "Cancelled" && before.status !== "Cancelled" && !stockRestored) {
    for (const item of before.items || []) {
      const productIndex = db.products.findIndex((product) => product.id === item.id);
      if (productIndex >= 0) {
        db.products[productIndex] = {
          ...db.products[productIndex],
          stock: Number(db.products[productIndex].stock || 0) + Number(item.qty || 0),
          updatedAt: now
        };
      }
    }
    stockRestored = true;
    changes.push({ at: now, label: "Stock restored", detail: `${(before.items || []).length} line items returned` });
  }

  db.orders[index] = { ...before, ...req.body, stockRestored, timeline: [...timeline, ...changes], updatedAt: now };
  await writeDb(db);
  res.json({ order: db.orders[index], orders: sortByNewest(db.orders), products: sortByNewest(db.products), stats: buildStats(db) });
});
app.post("/api/uploads/:kind", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Image file is required." });
  const kind = req.params.kind === "banner" ? "banner" : "product";
  const imagePath = publicUploadPath(kind, req.file.filename);
  if (kind === "banner") {
    const db = await readDb();
    const banner = { id: makeId("ban"), title: req.body.title || "Miraje fresh grocery banner", imagePath, createdAt: new Date().toISOString() };
    db.settings = db.settings || {};
    db.settings.banners = [banner, ...(db.settings.banners || [])].filter((item) => item?.imagePath).slice(0, 6);
    db.settings.activeBanner = banner;
    await writeDb(db);
    return res.status(201).json({ banner, settings: db.settings });
  }
  res.status(201).json({ imagePath });
});

app.post("/api/dev/reset", async (_req, res) => {
  const db = await resetDb();
  res.json({ ok: true, counts: { products: db.products.length, orders: db.orders.length } });
});

app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api") && fs.existsSync(path.join(frontendDist, "index.html"))) {
    return res.sendFile(path.join(frontendDist, "index.html"));
  }
  next();
});

app.listen(port, () => console.log(`Miraje backend running on http://127.0.0.1:${port}`));




