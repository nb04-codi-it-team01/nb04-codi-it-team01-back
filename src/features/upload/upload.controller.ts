import createError from 'http-errors';
import type { Request, Response, NextFunction } from 'express';

export async function postUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return next(createError(400, '파일이 없습니다.'));
  }

  // multer-s3를 사용하면 req.file 객체 안에 location(S3 URL)이 들어있습니다.
  const fileData = req.file as Express.MulterS3.File;

  // S3 업로드가 성공했다면 location이 존재함
  return res.status(201).json({
    message: '업로드 성공',
    url: fileData.location, // S3 URL
    key: fileData.key, // S3 파일 키
  });
}
