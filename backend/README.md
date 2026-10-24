# Backend OJE

## Configurar

Requiere Node.js 20 o posterior y PostgreSQL 14 o posterior. Desde `backend/`:

```powershell
npm ci
Copy-Item .env.example .env
```

Completa las variables locales de PostgreSQL en `.env` y establece `FRONTEND_ORIGIN` con el origen exacto de Vite (por ejemplo, `http://localhost:5173`). No configures credenciales en el frontend ni en variables `VITE_*`. No existe registro público. Tras aplicar ambas migraciones, crea o restablece la cuenta administrativa de forma interactiva:

```powershell
npm run admin:create -- admin@dominio.tld
```

El comando solicita la contraseña sin mostrarla, exige al menos 12 bytes y guarda únicamente un hash scrypt. No incluye una contraseña por defecto. El usuario recibe el rol `admin`.

Aplica en orden `database/migrations/001_initial_schema.sql`, `002_admin_sessions.sql`, `003_order_idempotency_fingerprint.sql` y `004_product_image_url.sql`; luego carga los seeds según `database/README.md`. Este entorno aún no ha verificado la conexión PostgreSQL.

## Ejecutar

```powershell
npm run dev
```

La API escucha en `http://localhost:3000`. `GET /api/health` devuelve estado de servicio y base de datos. La autenticación está en `POST /api/auth/login`, `POST /api/auth/logout` y `GET /api/auth/me`; las rutas administrativas usan una cookie `HttpOnly` respaldada por `auth_sessions`. La API permite credenciales CORS solo desde `FRONTEND_ORIGIN`; el frontend debe enviar `credentials: 'include'`. La cookie usa `SameSite=Lax` por defecto y `Secure` en producción. Para un frontend realmente cross-site configura HTTPS y `SESSION_COOKIE_SAME_SITE=none`. Además del catálogo, están disponibles la administración de ciudades y cupones, `POST /api/envios/cotizar`, `POST /api/cupones/validar`, la confirmación administrativa manual de pagos, `GET /api/resumen` y `GET /api/alertas-reposicion`. Las estimaciones de envío/cupón no reservan ni consumen usos. Consulta `../documentacion-ia/CONTRATOS_API.md` para contratos y filtros.

## Scripts

- `npm start`: servidor.
- `npm run dev`: servidor con recarga al guardar.
- `npm run check`: sintaxis de puntos de entrada.
- `npm test`: verificaciones automatizadas con PostgreSQL simulado; no verifica migraciones ni integración de base de datos.
- `npm run admin:create -- admin@dominio.tld`: alta/restablecimiento administrativo interactivo.
