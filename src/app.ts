import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './lib/passport/index';
import authRoute from './features/auth/auth.routes';
import cors from 'cors';
import productRoute from './features/product/product.route';
import userRoute from './features/user/user.route';
import storeRoute from './features/store/store.route';
import { requestLogger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/error-handler';
import Multer from 'multer';
import fs from 'fs';
import path from 'path';
import type { Request, Express } from 'express';
import { FileFilterCallback } from 'multer';
import multer from 'multer';
export const app = express();

type fileNameCallback = (error: Error | null, filename: string) => void;
type destinationCallback = (error: Error | null, result: string) => void;
const storage = Multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: destinationCallback): void => {
    const uploadPath = 'upload/';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath);
    }
    cb(null, uploadPath);
  },
  filename: (req: Request, file: Express.Multer.File, cb: fileNameCallback): void => {
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + Date.now() + ext;
    cb(null, filename);
  },
});
export const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 2 },
  fileFilter,
});

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

app.use('/api', authRoute);
app.use('/api', productRoute);
app.use('/api', upload.single('img'), userRoute);
app.use('/api', storeRoute);

app.use(errorHandler);
