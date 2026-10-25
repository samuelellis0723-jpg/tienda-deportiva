import { formatProductDate, isNewProduct, productDate } from '../../utils/product-date.js';

export default function ProductDate({ product }) {
  const date = productDate(product);
  return <div className="product-date">{date ? <time dateTime={date.toISOString()}>Agregado el {formatProductDate(date)}</time> : <span>Fecha no disponible</span>}{isNewProduct(product) && <span className="new-product-badge">Nuevo</span>}</div>;
}
