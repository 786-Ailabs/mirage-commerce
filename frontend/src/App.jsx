import { useEffect, useMemo, useState } from "react";
import { seedProducts } from "./data/seedProducts.js";
import Storefront from "./pages/Storefront.jsx";
import Admin from "./pages/Admin.jsx";
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import { mirajeApi } from "./services/api.js";

function loadState(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export default function App() {
  const [view, setView] = useState(() => new URLSearchParams(window.location.search).get("admin") === "1" ? "admin" : "store");
  const [products, setProducts] = useState(() => loadState("miraje-products", seedProducts));
  const [cart, setCart] = useState(() => loadState("miraje-cart", []));
  const [orders, setOrders] = useState(() => loadState("miraje-orders", []));
  const [settings, setSettings] = useState(() => loadState("miraje-settings", {}));
  const [customers, setCustomers] = useState(() => loadState("miraje-customers", []));
  const [stats, setStats] = useState(() => loadState("miraje-stats", {}));
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [apiStatus, setApiStatus] = useState({ connected: false, label: "Local fallback" });
  const [lastOrder, setLastOrder] = useState(() => loadState("miraje-last-order", null));
  const [adminNotice, setAdminNotice] = useState(null);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  useEffect(() => {
    function handleRoute() {
      setView(new URLSearchParams(window.location.search).get("admin") === "1" ? "admin" : "store");
    }
    window.addEventListener("popstate", handleRoute);
    return () => window.removeEventListener("popstate", handleRoute);
  }, []);

  function openStore() {
    window.history.pushState({}, "", window.location.pathname);
    setView("store");
  }

  useEffect(() => {
    let alive = true;
    async function loadCatalog() {
      try {
        const catalog = await mirajeApi.catalog();
        if (!alive) return;
        setProducts(catalog.products || seedProducts);
        setOrders(catalog.orders || []);
        setSettings(catalog.settings || {});
        setCustomers(catalog.customers || []);
        setStats(catalog.stats || {});
        saveState("miraje-products", catalog.products || seedProducts);
        saveState("miraje-orders", catalog.orders || []);
        saveState("miraje-settings", catalog.settings || {});
        saveState("miraje-customers", catalog.customers || []);
        saveState("miraje-stats", catalog.stats || {});
        setApiStatus({ connected: true, label: "Backend connected" });
      } catch {
        if (!alive) return;
        setApiStatus({ connected: false, label: "Local fallback" });
      }
    }
    loadCatalog();
    return () => { alive = false; };
  }, []);

  function persistProductsLocal(next) {
    setProducts(next);
    saveState("miraje-products", next);
  }

  function persistCart(next) {
    setCart(next);
    saveState("miraje-cart", next);
  }

  function persistOrdersLocal(next) {
    setOrders(next);
    saveState("miraje-orders", next);
  }

  function persistSettingsLocal(next) {
    setSettings(next || {});
    saveState("miraje-settings", next || {});
  }

  function persistCustomersLocal(next) {
    setCustomers(next || []);
    saveState("miraje-customers", next || []);
  }

  function persistStatsLocal(next) {
    setStats(next || {});
    saveState("miraje-stats", next || {});
  }

  function markConnected() {
    setApiStatus({ connected: true, label: "Backend connected" });
  }

  function markFallback() {
    setApiStatus({ connected: false, label: "Local fallback" });
  }

  function addToCart(product) {
    if (Number(product.stock || 0) <= 0) return;
    const existing = cart.find((item) => item.id === product.id);
    const currentQty = existing?.qty || 0;
    if (currentQty >= Number(product.stock || 0)) return;
    const next = existing
      ? cart.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
      : [...cart, { ...product, qty: 1 }];
    persistCart(next);
  }

  function increment(id) {
    const product = products.find((item) => item.id === id);
    persistCart(cart.map((item) => {
      if (item.id !== id) return item;
      const maxStock = Number(product?.stock || item.stock || 0);
      return { ...item, qty: Math.min(maxStock, item.qty + 1) };
    }));
  }

  function decrement(id) {
    const next = cart.map((item) => item.id === id ? { ...item, qty: item.qty - 1 } : item).filter((item) => item.qty > 0);
    persistCart(next);
  }

  async function checkout(total, customer) {
    const fallbackOrder = {
      id: `MIR-${String(orders.length + 1).padStart(4, "0")}`,
      items: cart,
      total,
      customer,
      status: "Draft",
      paymentMode: customer.paymentMode || "Cash on Delivery",
      paymentStatus: "Pending",
      createdAt: new Date().toISOString(),
    };

    try {
      const result = await mirajeApi.createOrder({ items: cart, total, customer, status: "Draft", paymentMode: customer.paymentMode || "Cash on Delivery", paymentStatus: customer.paymentMode === "Cash on Delivery" ? "Pending" : "Pending" });
      const nextOrders = result.orders || [result.order, ...orders];
      persistOrdersLocal(nextOrders);
      persistProductsLocal(result.products || products);
      persistCustomersLocal(result.customers || customers);
      persistStatsLocal(result.stats || stats);
      setLastOrder(result.order);
      saveState("miraje-last-order", result.order);
      markConnected();
    } catch (error) {
      if (error?.message?.includes("Stock") || error?.message?.includes("validation")) {
        alert("Some items are out of stock or quantity is not available. Please update your cart.");
        markFallback();
        return;
      }
      persistOrdersLocal([fallbackOrder, ...orders]);
      setLastOrder(fallbackOrder);
      saveState("miraje-last-order", fallbackOrder);
      markFallback();
    }

    persistCart([]);
    setView("confirmation");
  }

  async function addProduct(product) {
    try {
      const result = await mirajeApi.createProduct(product);
      const nextProducts = result.products || [result.product, ...products];
      persistProductsLocal(nextProducts);
      markConnected();
    } catch {
      persistProductsLocal([product, ...products]);
      markFallback();
    }
  }

  async function updateProduct(id, patch) {
    const nextLocal = products.map((product) => product.id === id ? { ...product, ...patch } : product);
    persistProductsLocal(nextLocal);
    try {
      const result = await mirajeApi.updateProduct(id, patch);
      persistProductsLocal(result.products || nextLocal);
      markConnected();
    } catch {
      markFallback();
    }
  }

  async function deleteProduct(id) {
    const confirmed = window.confirm("Delete this product from Miraje catalog?");
    if (!confirmed) return;
    const nextLocal = products.filter((product) => product.id !== id);
    persistProductsLocal(nextLocal);
    persistCart(cart.filter((item) => item.id !== id));
    try {
      const result = await mirajeApi.deleteProduct(id);
      persistProductsLocal(result.products || nextLocal);
      markConnected();
    } catch {
      markFallback();
    }
  }

  async function uploadProductImage(file) {
    try {
      const result = await mirajeApi.uploadProductImage(file);
      markConnected();
      return result;
    } catch (error) {
      markFallback();
      throw error;
    }
  }

  async function uploadBanner(file, title) {
    try {
      const result = await mirajeApi.uploadBanner(file, title);
      persistSettingsLocal(result.settings || settings);
      markConnected();
      return result;
    } catch (error) {
      markFallback();
      throw error;
    }
  }

  async function updateOrder(id, patch) {
    const nextLocal = orders.map((order) => order.id === id ? { ...order, ...patch } : order);
    persistOrdersLocal(nextLocal);
    try {
      const result = await mirajeApi.updateOrder(id, patch);
      persistOrdersLocal(result.orders || nextLocal);
      persistProductsLocal(result.products || products);
      persistStatsLocal(result.stats || stats);
      if (patch.status === "Cancelled" && result.order?.stockRestored && result.order?.timeline?.some((event) => event.label === "Stock restored")) {
        const restoredItems = (result.order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
        setAdminNotice({ type: "success", text: `Order ${result.order.id} cancelled. ${restoredItems} item(s) returned to inventory.` });
      }
      markConnected();
    } catch {
      markFallback();
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">M</div>
          <div><strong>Miraje</strong><span>Digital Grocery Store</span></div>
        </div>
        <div className="topbar-status">
          <div className={apiStatus.connected ? "api-badge connected" : "api-badge"}>{apiStatus.label}</div>
          <div className="cart-badge">Cart {cartCount}</div>
        </div>
      </header>

      {view === "confirmation" && lastOrder ? (
        <OrderConfirmation
          order={lastOrder}
          onContinueShopping={openStore}
        />
      ) : view === "store" ? (
        <Storefront
          products={products}
          settings={settings}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          search={search}
          setSearch={setSearch}
          cart={cart}
          onAdd={addToCart}
          onInc={increment}
          onDec={decrement}
          onClear={() => persistCart([])}
          onCheckout={checkout}
        />
      ) : (
        <Admin
          products={products}
          settings={settings}
          customers={customers}
          stats={stats}
          onAddProduct={addProduct}
          onUpdateProduct={updateProduct}
          onDeleteProduct={deleteProduct}
          onUploadProductImage={uploadProductImage}
          onUploadBanner={uploadBanner}
          orders={orders}
          adminNotice={adminNotice}
          onDismissNotice={() => setAdminNotice(null)}
          onUpdateOrder={updateOrder}
        />
      )}
    </div>
  );
}








