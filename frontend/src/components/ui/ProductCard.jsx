import { Link } from 'react-router-dom';
import { availableStock, productPrice, variantsOf } from '../../utils/format.js';
import { formatCRC } from '../../utils/format.js';
import ProductArtwork from './ProductArtwork.jsx';

export default function ProductCard({ product }) {
  if ((product?.estado ?? product?.status) !== 'publicado') return null;
  const variants = variantsOf(product);
  const stock = variants.reduce((sum, variant) => sum + availableStock(variant), 0);
  return <article className="product-card">
    <Link className="product-card-link" to={`/productos/${product.id}`} aria-label={`Ver ${product.name}`}>
      <ProductArtwork product={product} />
      <div className="product-card-info"><span className="product-overline">{product.categorias?.[0]?.name ?? product.categories?.[0]?.name ?? 'OJE / TATAMI'}</span><h3>{product.name}</h3><p className="product-price">{formatCRC(productPrice(product))}</p><p className={`stock-label ${stock > 0 ? 'in-stock' : ''}`}>{stock > 0 ? 'Disponible' : 'Agotado'}</p></div>
    </Link>
  </article>;
}
