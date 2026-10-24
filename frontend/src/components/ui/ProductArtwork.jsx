import { useEffect, useState } from 'react';
import { productImage } from '../../utils/format.js';

function Placeholder({ name }) {
  return <div className="artwork-placeholder" role="img" aria-label={`Imagen ilustrativa de ${name ?? 'producto OJE'}`}>
    <span className="artwork-top">OJE / EQUIPO DE TATAMI</span><span className="artwork-monogram">{(name || 'OJE').slice(0, 1).toUpperCase()}</span><span className="artwork-bottom">JUDO · BJJ</span>
  </div>;
}

export default function ProductArtwork({ product, className = '' }) {
  const src = productImage(product);
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [src]);
  return <div className={`product-artwork ${className}`}>
    {src && !failed ? <img src={src} alt={`Imagen del producto ${product?.name ?? ''}`} loading="lazy" onError={() => setFailed(true)} /> : <Placeholder name={product?.name} />}
  </div>;
}
