import multer from 'multer';
import { NextFunction, Request, Response, RequestHandler } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { AppError } from './error-handler';

type fileNameCallback = (error: Error | null, filename: string) => void;
type destinationCallback = (error: Error | null, result: string) => void;

const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: destinationCallback): void => {
    const uploadPath = path.join(process.cwd(), 'upload');

    fs.stat(uploadPath)
      .then(() => {
        // 폴더가 이미 존재하는 경우
        cb(null, uploadPath);
      })
      .catch((e) => {
        if (e.code === 'ENOENT') {
          // 폴더가 없으면 생성
          return fs
            .mkdir(uploadPath, { recursive: true })
            .then(() => {
              cb(null, uploadPath);
            })
            .catch((mkdirErr) => {
              // 폴더 생성 실패 시 에러 전달 (500 서버 에러로 처리됨)
              cb(mkdirErr, '');
            });
        }
        // 그 외 파일 시스템 오류는 바로 전달
        cb(e, '');
      });
  },

  filename: (req: Request, file: Express.Multer.File, cb: fileNameCallback): void => {
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + Date.now() + ext;
    cb(null, filename);
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

export const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 2 }, // 2MB 제한
  fileFilter,
});

// 업로드된 파일 접근용 URL 생성 헬퍼
export function buildImageUrl(req: Request, filename: string) {
  const proto = req.headers['x-forwarded-proto']?.toString() || req.protocol;
  const host = req.headers['x-forwarded-host']?.toString() || req.get('host');
  return `${proto}://${host}/upload/${encodeURIComponent(filename)}`;
}

export const mapImageToBody = (fieldName: string = 'image'): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.file) {
      const imageUrl = buildImageUrl(req, req.file.filename);
      req.body[fieldName] = imageUrl;
    }
    next();
  };
};
