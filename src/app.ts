import express from 'express';
import productRoute from './features/product/product.route';
import userRoute from './features/user/user.route';
import { requestLogger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/error-handler';

export const app = express();

app.use(express.json());
app.use(requestLogger);

app.use('/api/products', productRoute);
app.use('/api/users', userRoute);

app.use(errorHandler);
