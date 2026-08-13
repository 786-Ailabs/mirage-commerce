import { Fragment, useEffect, useMemo, useState } from "react";
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

const featuredCategories = [
  { name: "Fruits", icon: "Fr" },
  { name: "Vegetables", icon: "Vg" },
  { name: "Dairy", icon: "Dy" },
  { name: "Staples", icon: "St" },
  { name: "Snacks", icon: "Sn" },
  { name: "Household", icon: "Hm" }
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
  const posters = useMemo(() => (Array.isArray(settings?.posters) ? settings.posters.filter((item) => item?.imagePath).slice(0, 12) : []), [settings]);
  const offerBanners = useMemo(() => (Array.isArray(settings?.offerBanners) ? settings.offerBanners.filter((item) => item?.imagePath).slice(0, 8) : []), [settings]);
  const categoryCounts = useMemo(() => products.reduce((acc, product) => ({ ...acc, [product.category]: (acc[product.category] || 0) + 1 }), {}), [products]);
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

  function chooseCategory(category) {
    setActiveCategory(activeCategory === category ? "All" : category);
  }

  function renderPosterScroller(blockIndex) {
    if (!posters.length) return null;
    return (
      <section className="product-poster-scroller" aria-label={`Promotional posters ${blockIndex + 1}`}>
        <div className="poster-track">
          {posters.map((poster, index) => (
            <figure className="poster-slide" key={`${poster.id || poster.imagePath}-${blockIndex}`}>
              <img src={assetUrl(poster.imagePath)} alt={poster.title || `N Mart poster ${index + 1}`} />
            </figure>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="store-layout">
      <section className="store-main">
        <section className="category-icon-strip" aria-label="Featured categories">
          {featuredCategories.map((category) => (
            <button key={category.name} className={activeCategory === category.name ? "category-icon-card active" : "category-icon-card"} onClick={() => chooseCategory(category.name)}>
              <span>{category.icon}</span>
              <strong>{category.name}</strong>
            </button>
          ))}
        </section>

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
              <button key={category} className={category === activeCategory ? "chip active" : "chip"} onClick={() => category === "All" ? setActiveCategory("All") : chooseCategory(category)}>
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
          {offerBanners.length > 0 && (
            <div className="offer-banner-strip">
              {offerBanners.map((offer, index) => (
                <figure className="offer-banner-card" key={offer.id || offer.imagePath}>
                  <img src={assetUrl(offer.imagePath)} alt={offer.title || `N Mart offer banner ${index + 1}`} />
                </figure>
              ))}
            </div>
          )}
        </section>

        <div className="store-content-grid">
          <aside className="category-sidebar" aria-label="Category filters">
            <div className="sidebar-card">
              <div>
                <span className="eyebrow">Categories</span>
                <h2>Filter products</h2>
              </div>
              <label className="category-check">
                <input type="checkbox" checked={activeCategory === "All"} onChange={() => setActiveCategory("All")} />
                <span>All products</span>
                <em>{products.length}</em>
              </label>
              {categories.filter((category) => category !== "All").map((category) => (
                <label className="category-check" key={category}>
                  <input type="checkbox" checked={activeCategory === category} onChange={() => chooseCategory(category)} />
                  <span>{category}</span>
                  <em>{categoryCounts[category] || 0}</em>
                </label>
              ))}
            </div>
          </aside>

          <div id="new-arrivals" className="product-grid">
            {filtered.map((product, index) => (
              <Fragment key={product.id}>
                <ProductCard product={product} onAdd={onAdd} />
                {(index + 1) % 6 === 0 && renderPosterScroller(Math.floor(index / 6))}
              </Fragment>
            ))}
          </div>
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
