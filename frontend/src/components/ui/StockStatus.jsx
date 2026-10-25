import { availableStock } from '../../utils/format.js';

export default function StockStatus({ variant }) {
  const stock = availableStock(variant);
  const status = stock === 0 ? 'out_of_stock' : variant?.stockStatus;
  return <span className={`stock-status stock-${status || 'available'}`}>{stock === 0 ? 'Agotado · 0 unidades' : status === 'low' ? `¡Quedan pocas unidades! ${stock} ${stock === 1 ? 'unidad' : 'unidades'}` : `Disponible: ${stock} ${stock === 1 ? 'unidad' : 'unidades'}`}</span>;
}
