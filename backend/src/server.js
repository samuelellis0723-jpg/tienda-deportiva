import 'dotenv/config';
import app from './app.js';
import { closePool } from './config/database.js';

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => {
  console.log(`OJE API escuchando en el puerto ${port}.`);
});

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`Recibida señal ${signal}; cerrando servidor.`);
  server.close(async (error) => {
    try {
      await closePool();
      process.exit(error ? 1 : 0);
    } catch (closeError) {
      console.error('No se pudo cerrar PostgreSQL correctamente:', closeError.message);
      process.exit(1);
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));