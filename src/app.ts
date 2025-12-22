import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './lib/passport/index';
import authRoute from './features/auth/auth.routes';
import cors from 'cors';
import productRoute from './features/product/product.route';
import userRoute from './features/user/user.route';
import storeRoute from './features/store/store.route';
import orderRoute from './features/order/order.route';
import cartRoute from './features/cart/cart.route';
import inquiryRoute from './features/inquiry/inquiry.route';
import gradeRoute from './features/metadata/grade/grade.route';
import { requestLogger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/error-handler';
import reviewRoute from './features/review/review.route';

export const app = express();

app.use(cookieParser());
// CORS 설정 - 프론트엔드(3000)에서 접근 허용
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(requestLogger);

app.use('/upload', express.static('upload'));

app.use('/api', authRoute);
app.use('/api', userRoute);
app.use('/api', productRoute);
app.use('/api', storeRoute);
app.use('/api', reviewRoute);
app.use('/api', orderRoute);
app.use('/api', cartRoute);
app.use('/api', inquiryRoute);
app.use('/api', gradeRoute);

app.use(errorHandler);
