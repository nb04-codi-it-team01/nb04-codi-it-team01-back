import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { NextFunction, Request, Response, RequestHandler } from 'express';
import path from 'path';
import { AppError } from './error-handler';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) {
  // 허용 확장자 (jpeg, png, webp, gif)
  const ok = /image\/(jpeg|png|webp|gif)/.test(file.mimetype);
  if (!ok) {
    return cb(new AppError(415, '이미지 파일만 업로드할 수 있습니다.'));
  }
  cb(null, true);
}

const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_BUCKET_NAME!,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (_req, file, cb) {
    const ext = path.extname(file.originalname);
    const filename = `upload/${file.fieldname}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

export const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB 제한
  fileFilter,
});

export const mapImageToBody = (fieldName: string = 'image'): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.file) {
      const location = (req.file as Express.MulterS3.File).location;
      req.body[fieldName] = location;
    }
    next();
  };
};
