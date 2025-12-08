import type { RequestHandler } from 'express';

/**
 * 요청/응답 로깅 미들웨어.
 *
 * - 요청이 들어온 시점을 기록해 두었다가
 * - 응답이 끝나는 시점(`res.on('finish')`)에 상태 코드, 메서드, URL, 처리 시간(ms)을 로그로 남긴다.
 *
 * 예시 로그:
 *   [백엔드] 200 POST /api/products - 32ms
 */
export const requestLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[백엔드] ${res.statusCode} ${req.method} ${req.originalUrl} - ${duration}ms`);
  });

  next();
};
