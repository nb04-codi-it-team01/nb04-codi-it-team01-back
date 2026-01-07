import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { NextFunction, Request, Response, RequestHandler } from 'express';
import path from 'path';
import fs from 'fs';
import { AppError } from './error-handler';

// 파일 필터
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

// 스토리지 설정: 환경에 따라 로컬 또는 S3 사용
const useLocalUpload = process.env.USE_LOCAL_UPLOAD === 'true' || process.env.NODE_ENV === 'test';

let storage: multer.StorageEngine;

if (useLocalUpload) {
  // 로컬 디스크 스토리지 (테스트 환경)
  const uploadDir = process.env.LOCAL_UPLOAD_DIR || 'test-uploads';

  // 업로드 디렉토리 생성
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${file.fieldname}-${Date.now()}${ext}`;
      cb(null, filename);
    },
  });
} else {
  // S3 스토리지 (프로덕션 환경)
  const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const filename = `upload/${file.fieldname}-${Date.now()}${ext}`;
      cb(null, filename);
    },
  });
}

export const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB 제한
  fileFilter,
});

export const mapImageToBody = (fieldName: string = 'image'): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.file) {
      if (useLocalUpload) {
        // 로컬 파일 경로
        req.body[fieldName] = `/uploads/${req.file.filename}`;
      } else {
        // S3 URL
        const location = (req.file as Express.MulterS3.File).location;
        req.body[fieldName] = location;
      }
    }
    next();
  };
};
