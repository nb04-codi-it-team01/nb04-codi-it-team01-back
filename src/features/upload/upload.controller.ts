import fs from 'fs/promises';
import createError from 'http-errors';

import { buildImageUrl } from '../../shared/middleware/upload-handler';

import type { Request, Response, NextFunction } from 'express';
// ✅ promises API

export async function postUpload(req: Request, res: Response, next: NextFunction) {
  if (!req.file) {
    return next(createError(400, '파일이 없습니다.'));
  }

  // 0바이트 방어: 업로드 직후 검사
  if (!req.file.size || req.file.size === 0) {
    await fs.unlink(req.file.path).catch(() => {});
    return next(createError(400, '빈 파일은 업로드할 수 없습니다.'));
  }

  const imageUrl = buildImageUrl(req, req.file.filename);
  return res.status(201).json({ imageUrl });
}
