import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import CartPanel from "../components/CartPanel.jsx";
import { categories } from "../data/seedProducts.js";
import { assetUrl } from "../services/api.js";

const topOffers = [
  { title: "Deals of the week", subtitle: "Fresh savings every day", accent: "deal" },
  { title: "Big pack, bigger discounts", subtitle: "Save more on family packs", accent: "pack" },
  { title: "Combos you can't miss", subtitle: "Best grocery bundles", accent: "combo" },
  { title: "Rs 50 gift vouchers", subtitle: "Rewards on selected orders", accent: "voucher" }
];

export default function Storefront({ products, settings, activeCategory, setActiveCategory, search, setSearch, cart, cartOpen, onAdd, onInc, onDec, onClear, onCheckout, onCloseCart }) {
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const filtered = products.filter((product) => {
    const byCategory = activeCategory === "All" || product.category === activeCategory;
    const bySearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.category.toLowerCase().includes(search.toLowerCase());
    return byCategory && bySearch;
  });
  const banners = useMemo(() => {
    const savedBanners = Array.isArray(settings?.banners) ? settings.banners.filter((item) => item?.imagePath) : [];
    if (savedBanners.length) return savedBanners.slice(0, 6);
    return settings?.activeBanner?.imagePath ? [settings.activeBanner] : [];
  }, [settings]);
  const banner = banners[activeBannerIndex] || banners[0];

  useEffect(() => {
    setActiveBannerIndex(0);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveBannerIndex((index) => (index + 1) % banners.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  function moveBanner(direction) {
    if (banners.length <= 1) return;
    setActiveBannerIndex((index) => (index + direction + banners.length) % banners.length);
  }

  return (
    <main className="store-layout">
      <section className="store-main">
        <div id="home-banner" className={banner?.imagePath ? "hero-card has-banner" : "hero-card"}>
          {banner?.imagePath && <img className="hero-banner-img" src={assetUrl(banner.imagePath)} alt={banner.title || "N Mart banner"} />}
          {!banner?.imagePath && (
            <>
              <div>
                <span className="eyebrow">Digital grocery platform</span>
                <h1>N Mart fresh grocery store</h1>
                <p>Build orders, manage stock, and prepare fast local delivery from one clean dashboard.</p>
              </div>
              <div className="hero-metric">
                <strong>{products.length}</strong>
                <span>active products</span>
              </div>
            </>
          )}
          {banners.length > 1 && (
            <>
              <button className="banner-arrow banner-arrow-left" onClick={() => moveBanner(-1)} aria-label="Previous banner">‹</button>
              <button className="banner-arrow banner-arrow-right" onClick={() => moveBanner(1)} aria-label="Next banner">›</button>
              <div className="banner-dots" aria-label="Banner carousel">
                {banners.map((item, index) => (
                  <button
                    key={item.id || item.imagePath}
                    className={index === activeBannerIndex ? "banner-dot active" : "banner-dot"}
                    onClick={() => setActiveBannerIndex(index)}
                    aria-label={`Show banner ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div id="category-filters" className="toolbar-card category-filter-card">
          <div className="category-row">
            {categories.map((category) => (
              <button key={category} className={category === activeCategory ? "chip active" : "chip"} onClick={() => setActiveCategory(category)}>
                {category}
              </button>
            ))}
          </div>
        </div>

        <section id="deals" className="top-offers-card">
          <div className="offers-heading">
            <div>
              <span className="eyebrow">Top offers</span>
              <h2>Save more on N Mart groceries</h2>
            </div>
            <span>Limited time</span>
          </div>
          <div className="offers-grid">
            {topOffers.map((offer) => (
              <button className={`offer-tile ${offer.accent}`} key={offer.title}>
                <strong>{offer.title}</strong>
                <span>{offer.subtitle}</span>
              </button>
            ))}
          </div>
        </section>

        <div id="new-arrivals" className="product-grid">
          {filtered.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}
        </div>
      </section>

      {cartOpen && (
        <div className="cart-drawer-layer" role="presentation">
          <button className="cart-drawer-backdrop" type="button" onClick={onCloseCart} aria-label="Close cart" />
          <CartPanel cart={cart} onInc={onInc} onDec={onDec} onClear={onClear} onCheckout={onCheckout} onClose={onCloseCart} />
        </div>
      )}
    </main>
  );
}
