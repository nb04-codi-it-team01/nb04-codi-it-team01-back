import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './lib/passport/index';
import cors from 'cors';
import apiRouter from './index';
import { requestLogger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/error-handler';
export const app = express();

app.use(cookieParser());
// CORS 설정 - 프론트엔드(3000)에서 접근 허용
app.use(
  cors({
    origin: 'http://43.201.15.176:3000',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(requestLogger);

app.use('/upload', express.static('upload'));

app.use('/api', apiRouter);

app.use(errorHandler);
