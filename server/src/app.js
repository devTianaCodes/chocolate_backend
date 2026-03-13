import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(express.static('public'));

app.use('/api/health', healthRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
