import { createContext, useContext, useEffect, useState } from 'react';
import { getCategories } from '../services/product-service.js';
import { estimateShipping, getCities } from '../services/shipping-service.js';
import { useCatalogRevision } from '../hooks/useCatalogRevision.js';

const StoreContext = createContext({ categories: [], threshold: null });
export function StoreProvider({ children }) {
  const revision = useCatalogRevision();
  const [categories, setCategories] = useState([]);
  const [threshold, setThreshold] = useState(null);
  useEffect(() => {
    let active = true;
    getCategories().then(rows => { if (active) setCategories(rows.filter(row => row.isActive !== false)); }).catch(() => {});
    getCities().then(rows => rows.length ? estimateShipping(rows[0].id, 0) : null).then(quote => {
      if (active && Number(quote?.freeShippingThreshold) > 0) setThreshold(Number(quote.freeShippingThreshold));
    }).catch(() => {});
    return () => { active = false; };
  }, [revision]);
  return <StoreContext.Provider value={{ categories, threshold }}>{children}</StoreContext.Provider>;
}
export const useStore = () => useContext(StoreContext);
