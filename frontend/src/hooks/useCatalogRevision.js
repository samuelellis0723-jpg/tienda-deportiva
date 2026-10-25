import { useEffect, useState } from 'react';
import { subscribeCatalogRefresh } from '../services/catalog-events.js';

export function useCatalogRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => subscribeCatalogRefresh(() => setRevision(value => value + 1)), []);
  return revision;
}
