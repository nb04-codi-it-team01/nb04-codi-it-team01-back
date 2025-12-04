import type { Request, Response, NextFunction } from 'express';
import http from 'http';
import { ZodError } from 'zod';

/**
 * 커스텀 에러 클래스.
 *
 * 서비스/컨트롤러에서 throw new AppError(...) 형태로 사용하며,
 * errorHandler 미들웨어에서 캐치되어 공통 에러 응답 포맷으로 변환된다.
 */
export class AppError extends Error {
  statusCode: number;
  error: string;

  constructor(statusCode: number, message: string, error?: string) {
    super(message);
    this.statusCode = statusCode;
    this.error = error ?? 'Error';

    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Express 전역 에러 핸들러.
 *
 * 컨트롤러/서비스에서 던진 에러를 받아서
 * 공통 포맷(JSON)으로 응답을 내려준다.
 *
 * @param err   발생한 에러 객체
 * @param _req  Express Request
 * @param res   Express Response
 * @param _next 다음 미들웨어 (사용 안 함)
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      statusCode: 400,
      message: '요청 데이터가 올바르지 않습니다.',
      error: 'Bad Request',
    });
  }

  if (err instanceof AppError) {
    const statusCode = err.statusCode;
    const errorName = err.error || http.STATUS_CODES[statusCode] || 'Error';

    return res.status(statusCode).json({
      statusCode,
      message: err.message,
      error: errorName,
    });
  }

  const statusCode = 500;
  const errorName = http.STATUS_CODES[statusCode] || 'Error';

  return res.status(statusCode).json({
    statusCode,
    message: '서버 에러가 발생했습니다.',
    error: errorName,
  });
}
