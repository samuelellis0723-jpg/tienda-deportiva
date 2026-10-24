import express from 'express';
import apiRoutes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.js';
import { ApiError } from './utils/errors.js';
import { credentialCors } from './middlewares/cors.js';

const app = express();
app.disable('x-powered-by');
app.use(credentialCors);
app.use(express.json({ limit: '1mb' }));
app.use((error, _req, _res, next) => {
  if (error instanceof SyntaxError && 'body' in error) return next(new ApiError(400, 'El cuerpo JSON no es válido.'));
  return next(error);
});
app.use('/api', apiRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;