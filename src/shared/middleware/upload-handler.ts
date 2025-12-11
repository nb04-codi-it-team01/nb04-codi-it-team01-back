import Multer from 'multer';
import fs from 'fs';
import path from 'path';
import type { Request } from 'express';
import { FileFilterCallback } from 'multer';
import multer from 'multer';

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
export const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 2 },
  fileFilter,
});
