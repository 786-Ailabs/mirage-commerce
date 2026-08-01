import { useMemo, useState } from "react";
import { assetUrl } from "../services/api.js";

const emptyForm = { name: "", category: "Fruits", unit: "1 kg", price: "", mrp: "", stock: "", tag: "Fresh", imagePath: "" };
const orderStatuses = ["Draft", "Accepted", "Packed", "Out for Delivery", "Delivered", "Cancelled"];
const paymentModes = ["Cash on Delivery", "UPI", "Card", "Wallet", "Bank Transfer"];
const paymentStatuses = ["Pending", "Paid", "Failed", "Refunded"];

function toForm(product) {
  return { name: product.name || "", category: product.category || "Fruits", unit: product.unit || "1 kg", price: String(product.price || ""), mrp: String(product.mrp || ""), stock: String(product.stock || ""), tag: product.tag || "Fresh", imagePath: product.imagePath || "" };
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function printOrder(order) {
  const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const delivery = Math.max(0, Number(order.total || 0) - subtotal);
  const rows = (order.items || []).map((item, index) => `
    <tr><td>${index + 1}</td><td><strong>${item.name}</strong><br/><span>${item.unit || ""}</span></td><td>${item.qty}</td><td>INR ${item.price}</td><td>INR ${Number(item.price || 0) * Number(item.qty || 0)}</td></tr>
  `).join("");
  const html = `<!doctype html><html><head><title>${order.id} Invoice</title><style>
    *{box-sizing:border-box}body{font-family:Inter,Arial,sans-serif;margin:0;color:#183324;background:#f4f8ef}.page{max-width:900px;margin:0 auto;background:#fff;min-height:100vh;padding:34px}.head{display:flex;justify-content:space-between;gap:24px;border-bottom:4px solid #0f7b43;padding-bottom:18px;margin-bottom:22px}.brand h1{margin:0;color:#0f7b43;font-size:34px}.brand p,.muted{color:#667866;margin:4px 0}.invoice-box{text-align:right}.invoice-box strong{font-size:22px;color:#173c26}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:18px 0}.box{background:#f9fcf6;border:1px solid #dbe8d4;border-radius:14px;padding:16px}.box h3{margin:0 0 10px;color:#0f7b43}table{width:100%;border-collapse:collapse;margin-top:18px}th{background:#0f7b43;color:#fff;text-align:left;padding:12px}td{border-bottom:1px solid #dbe8d4;padding:12px;vertical-align:top}td span{color:#667866}.totals{margin-left:auto;margin-top:18px;max-width:320px}.totals div{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e6eee2}.totals .grand{font-size:22px;font-weight:900;color:#0f7b43}.footer{margin-top:34px;padding-top:16px;border-top:1px solid #dbe8d4;color:#667866;font-size:13px}.actions{margin-top:24px;text-align:right}.actions button{border:0;background:#0f7b43;color:white;border-radius:12px;padding:12px 18px;font-weight:800}@media print{body{background:#fff}.page{padding:20px}.actions{display:none}}@media(max-width:700px){.grid,.head{grid-template-columns:1fr;display:grid}.invoice-box{text-align:left}}
  </style></head><body><main class="page"><section class="head"><div class="brand"><h1>Miraje</h1><p>Digital Grocery Store</p><p>Fresh grocery delivery and local fulfilment</p></div><div class="invoice-box"><strong>Invoice / Order</strong><p>${order.id}</p><p class="muted">${formatDate(order.createdAt)}</p><p>Status: <strong>${order.status}</strong></p></div></section><section class="grid"><div class="box"><h3>Customer</h3><p><strong>${order.customer?.name || "Customer"}</strong></p><p>${order.customer?.phone || ""}</p><p>${order.customer?.address || ""}</p></div><div class="box"><h3>Delivery</h3><p><strong>${order.customer?.deliverySlot || "Slot not selected"}</strong></p><p>${order.customer?.note || "No special note"}</p></div></section><table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table><section class="totals"><div><span>Subtotal</span><strong>INR ${subtotal}</strong></div><div><span>Delivery</span><strong>${delivery ? `INR ${delivery}` : "Free"}</strong></div><div class="grand"><span>Total</span><strong>INR ${order.total}</strong></div></section><p class="footer">Thank you for shopping with Miraje. Please verify items during delivery. Perishable goods are packed fresh and should be stored immediately.</p><div class="actions"><button onclick="window.print()">Print / Save PDF</button></div></main></body></html>`;
  const win = window.open("", "_blank", "width=960,height=760");
  win.document.write(html);
  win.document.close();
}

export default function Admin({ products = [], settings = {}, customers = [], stats = {}, onAddProduct, onUpdateProduct, onDeleteProduct, onUploadProductImage, onUploadBanner, orders = [], adminNotice, onDismissNotice, onUpdateOrder }) {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [bannerTitle, setBannerTitle] = useState(settings?.activeBanner?.title || "Miraje fresh grocery store");
  const [uploading, setUploading] = useState("");
  const [orderFilter, setOrderFilter] = useState("All");
  const [orderSearch, setOrderSearch] = useState("");
  const totalStock = (products || []).reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const pricedProducts = (products || []).filter((product) => Number(product.price) > 0).length;
  const lowStock = (products || []).filter((product) => Number(product.stock || 0) <= 10).length;
  const statusCounts = stats?.byStatus || {};

  const filteredOrders = useMemo(() => (orders || []).filter((order) => {
    const byStatus = orderFilter === "All" || order.status === orderFilter;
    const needle = orderSearch.toLowerCase();
    const searchable = `${order.id} ${order.customer?.name || ""} ${order.customer?.phone || ""} ${order.customer?.address || ""}`.toLowerCase();
    return byStatus && searchable.includes(needle);
  }), [orders, orderFilter, orderSearch]);

  function updateField(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  async function handleProductImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading("product");
    try { const result = await onUploadProductImage(file); updateField("imagePath", result.imagePath); }
    finally { setUploading(""); event.target.value = ""; }
  }

  async function handleBannerUpload(event) {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (!files.length) return;
    setUploading("banner");
    try {
      for (const file of files) await onUploadBanner(file, bannerTitle);
    }
    finally { setUploading(""); event.target.value = ""; }
  }

  function submitProduct(event) {
    event.preventDefault();
    if (!form.name || !form.price) return;
    const payload = { ...form, price: Number(form.price), mrp: Number(form.mrp || form.price), stock: Number(form.stock || 0), image: form.name.split(" ")[0].toLowerCase() };
    if (editingId) onUpdateProduct(editingId, payload);
    else onAddProduct({ id: `prd-${Date.now()}`, ...payload });
    setForm(emptyForm);
    setEditingId(null);
  }

  function editProduct(product) { setEditingId(product.id); setForm(toForm(product)); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function cancelEdit() { setEditingId(null); setForm(emptyForm); }

  return (
    <main className="admin-layout">
      <section className="admin-summary-grid">
        <div className="summary-card"><span>Products</span><strong>{(products || []).length}</strong></div>
        <div className="summary-card"><span>Total Stock</span><strong>{totalStock}</strong></div>
        <div className="summary-card"><span>Priced Items</span><strong>{pricedProducts}</strong></div>
        <div className="summary-card"><span>Low Stock</span><strong>{lowStock}</strong></div>
        <div className="summary-card"><span>Orders</span><strong>{(orders || []).length}</strong></div>
        <div className="summary-card"><span>Revenue</span><strong>INR {Number(stats?.revenue || 0)}</strong></div>
        <div className="summary-card"><span>Paid</span><strong>INR {Number(stats?.paid || 0)}</strong></div>
        <div className="summary-card"><span>Payment Due</span><strong>INR {Number(stats?.pendingPayment || 0)}</strong></div>
      </section>

      {adminNotice && (
        <section className={`admin-notice ${adminNotice.type || "success"}`}>
          <div><strong>Inventory updated</strong><span>{adminNotice.text}</span></div>
          <button onClick={onDismissNotice} aria-label="Dismiss notice">Dismiss</button>
        </section>
      )}

      <section className="admin-card board-card">
        <div className="panel-heading"><div><span className="eyebrow">Order board</span><h2>Live fulfilment status</h2></div></div>
        <div className="status-board">
          <button className={orderFilter === "All" ? "status-column active" : "status-column"} onClick={() => setOrderFilter("All")}><span>All</span><strong>{(orders || []).length}</strong></button>
          {orderStatuses.map((status) => <button className={orderFilter === status ? "status-column active" : "status-column"} key={status} onClick={() => setOrderFilter(status)}><span>{status}</span><strong>{statusCounts[status] || 0}</strong></button>)}
        </div>
      </section>

      <section className="admin-card banner-admin-card"><div className="panel-heading"><div><span className="eyebrow">Storefront carousel</span><h2>Homepage banner images</h2><p className="helper-text">Recommended size: 1600 x 500 px. Upload 5 or 6 images, JPG/PNG/WebP, below 5 MB each.</p></div>{settings?.activeBanner?.imagePath && <img className="banner-thumb" src={assetUrl(settings.activeBanner.imagePath)} alt="Active banner" />}</div><div className="banner-upload-row"><input placeholder="Banner title" value={bannerTitle} onChange={(event) => setBannerTitle(event.target.value)} /><label className="upload-button">{uploading === "banner" ? "Uploading..." : "Upload Carousel Images"}<input type="file" accept="image/*" multiple onChange={handleBannerUpload} /></label></div><div className="banner-thumb-row">{(settings?.banners || []).slice(0, 6).map((banner, index) => <figure key={banner.id || banner.imagePath} className="banner-preview"><img src={assetUrl(banner.imagePath)} alt={banner.title || `Banner ${index + 1}`} /><figcaption>Banner {index + 1}</figcaption></figure>)}</div></section>

      <section className="admin-card"><div className="panel-heading"><div><span className="eyebrow">Catalog admin</span><h2>{editingId ? "Edit grocery product" : "Add grocery product"}</h2></div>{editingId && <button className="ghost-button" onClick={cancelEdit}>Cancel Edit</button>}</div><form className="product-form" onSubmit={submitProduct}><input placeholder="Product name" value={form.name} onChange={(event) => updateField("name", event.target.value)} /><select value={form.category} onChange={(event) => updateField("category", event.target.value)}><option>Fruits</option><option>Vegetables</option><option>Dairy</option><option>Staples</option><option>Beverages</option><option>Snacks</option><option>Household</option></select><input placeholder="Unit" value={form.unit} onChange={(event) => updateField("unit", event.target.value)} /><input placeholder="Selling price" type="number" value={form.price} onChange={(event) => updateField("price", event.target.value)} /><input placeholder="MRP" type="number" value={form.mrp} onChange={(event) => updateField("mrp", event.target.value)} /><input placeholder="Stock" type="number" value={form.stock} onChange={(event) => updateField("stock", event.target.value)} /><input placeholder="Product tag" value={form.tag} onChange={(event) => updateField("tag", event.target.value)} /><label className="upload-button">{uploading === "product" ? "Uploading..." : form.imagePath ? "Change Photo" : "Upload Photo"}<input type="file" accept="image/*" onChange={handleProductImage} /></label>{form.imagePath && <img className="product-form-preview" src={assetUrl(form.imagePath)} alt="Product preview" />}<button className="checkout-button">{editingId ? "Update Product" : "Save Product"}</button></form></section>

      <section className="admin-card"><div className="panel-heading"><div><span className="eyebrow">Customers</span><h2>Customer address book</h2></div></div><div className="customer-grid">{(customers || []).length === 0 ? <div className="empty-cart">No customers saved yet. Checkout creates customer profiles automatically.</div> : (customers || []).map((customer) => <div className="customer-card" key={customer.id}><strong>{customer.name}</strong><span>{customer.phone}</span><p>{customer.address}</p><em>{customer.orderCount || 0} orders - INR {Number(customer.totalSpend || 0)}</em></div>)}</div></section>

      <section className="admin-card"><div className="panel-heading"><div><span className="eyebrow">Inventory</span><h2>Product stock and pricing</h2></div></div><div className="product-admin-list">{(products || []).map((product) => <div className="product-admin-row" key={product.id}><div className="admin-product-title">{product.imagePath && <img src={assetUrl(product.imagePath)} alt={product.name} />}<div><strong>{product.name}</strong><span>{product.category} - {product.unit} - INR {product.price}</span></div></div><div className="stock-pill">Stock {product.stock}</div><div className="row-actions"><button onClick={() => onUpdateProduct(product.id, { stock: Math.max(0, Number(product.stock || 0) - 1) })}>-Stock</button><button onClick={() => onUpdateProduct(product.id, { stock: Number(product.stock || 0) + 1 })}>+Stock</button><button onClick={() => editProduct(product)}>Edit</button><button className="danger-button" onClick={() => onDeleteProduct(product.id)}>Delete</button></div></div>)}</div></section>

            <section className="admin-card">
        <div className="panel-heading">
          <div><span className="eyebrow">Orders</span><h2>Orders and invoices</h2></div>
          <input className="order-search" placeholder="Search order, customer, phone..." value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} />
        </div>
        <div className="orders-list">
          {filteredOrders.length === 0 ? <div className="empty-cart">No matching orders.</div> : filteredOrders.map((order) => (
            <div className="order-row order-ops-row" key={order.id}>
              <div>
                <strong>{order.id}</strong>
                <span>{order.customer?.name || "Walk-in customer"} - {order.customer?.phone || "No phone"}</span>
                <small>{order.customer?.deliverySlot || "No slot"}</small>
              </div>
              <span>{(order.items || []).length} items</span>
              <span>INR {order.total}</span>
              <select value={order.status} onChange={(event) => onUpdateOrder(order.id, { status: event.target.value })}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select>
              <select value={order.paymentMode || "Cash on Delivery"} onChange={(event) => onUpdateOrder(order.id, { paymentMode: event.target.value })}>{paymentModes.map((mode) => <option key={mode}>{mode}</option>)}</select>
              <select value={order.paymentStatus || "Pending"} onChange={(event) => onUpdateOrder(order.id, { paymentStatus: event.target.value })}>{paymentStatuses.map((status) => <option key={status}>{status}</option>)}</select>
              <input className="delivery-person-input" placeholder="Delivery person" value={order.deliveryPerson || ""} onChange={(event) => onUpdateOrder(order.id, { deliveryPerson: event.target.value || "Unassigned" })} />
              <button className="invoice-button" onClick={() => printOrder(order)}>Invoice</button>
              <div className="order-timeline">{(order.timeline || []).slice(-4).map((event, index) => <span key={`${order.id}-${index}`}><strong>{event.label}</strong> {event.detail}</span>)}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}





