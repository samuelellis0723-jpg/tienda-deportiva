export const CATALOG_CHANGE_EVENT = 'oje:catalog-changed';
export const CATALOG_STORAGE_KEY = 'oje-catalog-revision';

export function notifyCatalogChange() {
  globalThis.dispatchEvent?.(new Event(CATALOG_CHANGE_EVENT));
  try { localStorage.setItem(CATALOG_STORAGE_KEY, `${Date.now()}-${Math.random()}`); } catch { /* El evento local funciona aunque el navegador no permita almacenamiento. */ }
}

export function subscribeCatalogRefresh(callback) {
  const refresh = () => { if (document.visibilityState !== 'hidden') callback(); };
  const storage = event => { if (event.key === CATALOG_STORAGE_KEY) refresh(); };
  globalThis.addEventListener('focus', refresh);
  globalThis.addEventListener('pageshow', refresh);
  globalThis.addEventListener(CATALOG_CHANGE_EVENT, refresh);
  globalThis.addEventListener('storage', storage);
  document.addEventListener('visibilitychange', refresh);
  return () => {
    globalThis.removeEventListener('focus', refresh);
    globalThis.removeEventListener('pageshow', refresh);
    globalThis.removeEventListener(CATALOG_CHANGE_EVENT, refresh);
    globalThis.removeEventListener('storage', storage);
    document.removeEventListener('visibilitychange', refresh);
  };
}
