const isLocalVite = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port === "5173";
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || (isLocalVite ? "http://127.0.0.1:4100" : window.location.origin);
const API_BASE = `${API_ORIGIN}/api`;
export const ASSET_BASE = API_ORIGIN;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Mirage API request failed");
  }

  return response.json();
}

async function upload(path, file, fields = {}) {
  const formData = new FormData();
  formData.append("image", file);
  Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", body: formData });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Mirage upload failed");
  }
  return response.json();
}

export function assetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${ASSET_BASE}${path}`;
}

export const mirajeApi = {
  health() {
    return request("/health");
  },
  catalog() {
    return request("/catalog");
  },
  createProduct(product) {
    return request("/products", { method: "POST", body: JSON.stringify(product) });
  },
  updateProduct(id, patch) {
    return request(`/products/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  deleteProduct(id) {
    return request(`/products/${id}`, { method: "DELETE" });
  },
  createOrder(order) {
    return request("/orders", { method: "POST", body: JSON.stringify(order) });
  },
  updateOrder(id, patch) {
    return request(`/orders/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  uploadProductImage(file) {
    return upload("/uploads/product", file);
  },
  uploadBanner(file, title) {
    return upload("/uploads/banner", file, { title });
  }
};
