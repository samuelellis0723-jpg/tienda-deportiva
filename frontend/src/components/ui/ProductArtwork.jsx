import { useEffect, useState } from 'react';
import { productImage, variantsOf } from '../../utils/format.js';
import { productTypeImage, safeProductImage, sportCategories } from '../../utils/catalog-taxonomy.js';

function Placeholder({ name }) {
  return <div className="artwork-placeholder" role="img" aria-label={`Imagen ilustrativa de ${name ?? 'producto OJE'}`}>
    <span className="artwork-top">OJE / EQUIPO DE TATAMI</span><span className="artwork-monogram">{(name || 'OJE').slice(0, 1).toUpperCase()}</span><span className="artwork-bottom">JUDO · BJJ</span>
  </div>;
}

export default function ProductArtwork({ product, variant, className = '' }) {
  const src = safeProductImage(productImage(product));
  const [failed, setFailed] = useState(false);
  const categoryRows = product?.categorias ?? product?.categories ?? [];
  const sportIds = new Set(sportCategories(categoryRows).map(category => String(category.id)));
  const legacyType = categoryRows.find(category => sportIds.has(String(category.parentId)));
  const type = product?.tipoProducto ?? legacyType;
  const fallbackColor = variant?.color ?? variantsOf(product).find(row => row.isActive !== false && row.is_active !== false)?.color;
  const fallbackSrc = productTypeImage(type, fallbackColor);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  useEffect(() => { setFailed(false); setFallbackFailed(false); }, [src, fallbackSrc]);
  const displayedSrc = src && !failed ? src : fallbackSrc;
  const typeName = type?.name || 'equipo deportivo';
  const isIllustration = displayedSrc.startsWith('/catalog-art/') && displayedSrc.endsWith('.svg');
  const alt = isIllustration
    ? `Ilustración OJE de ${typeName}: ${product?.name ?? 'producto'}`
    : `Imagen de ${product?.name ?? typeName}`;
  return <div className={`product-artwork ${className}`}>
    {!fallbackFailed ? <img src={displayedSrc} width="640" height="480" alt={alt} loading="lazy" decoding="async" onError={() => { if (src && !failed) setFailed(true); else setFallbackFailed(true); }} /> : <Placeholder name={typeName} />}
  </div>;
}
