import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './lib/passport/index.js';
import authRoute from './features/auth/auth.routes.js';
import productRoute from './features/product/product.route';
import { requestLogger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/error-handler';

export const app = express();

app.use(cookieParser());
app.use(express.json());

app.use(passport.initialize());
app.use('/api', authRoute);
app.use(requestLogger);

app.use('/api', productRoute);

app.use(errorHandler);
