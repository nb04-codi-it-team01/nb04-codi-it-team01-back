import express from 'express';
import productRoute from '../src/features/product/product.route';

export const app = express();

app.use(express.json());

app.use('/api', productRoute);
