import { assetUrl } from "../services/api.js";

export default function ProductCard({ product, onAdd }) {
  const discount = Math.max(0, Math.round(((product.mrp - product.price) / product.mrp) * 100));
  const hasImage = Boolean(product.imagePath);

  return (
    <article className="product-card">
      <div className={hasImage ? "product-art has-photo" : "product-art"} data-type={product.category.toLowerCase()}>
        {hasImage ? <img src={assetUrl(product.imagePath)} alt={product.name} /> : <span>{product.image}</span>}
      </div>
      <div className="product-meta">
        <span className="product-tag">{product.tag}</span>
        <h3>{product.name}</h3>
        <p>{product.unit} - {product.stock} in stock</p>
      </div>
      <div className="price-row">
        <div>
          <strong>INR {product.price}</strong>
          <span>MRP INR {product.mrp}</span>
        </div>
        {discount > 0 && <em>{discount}% off</em>}
      </div>
      <button className="add-button" disabled={Number(product.stock || 0) <= 0} onClick={() => onAdd(product)}>
        {Number(product.stock || 0) <= 0 ? "Out of Stock" : "Add"}
      </button>
    </article>
  );
}

