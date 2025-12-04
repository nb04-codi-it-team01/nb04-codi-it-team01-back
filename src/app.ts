import express from 'express';
import productRoute from './features/product/product.route';
import { requestLogger } from './shared/middleware/logger';

export const app = express();

app.use(express.json());
app.use(requestLogger);

app.use('/api', productRoute);
