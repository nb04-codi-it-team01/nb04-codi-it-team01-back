import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { z } from 'zod';

/**
 * Zod 스키마로 req.body를 검증하는 미들웨어.
 *
 * - 스키마에 맞지 않으면 ZodError를 next()로 넘겨서
 *   전역 errorHandler에서 400 응답으로 처리할 수 있게 한다.
 * - 스키마에 맞으면 파싱된 값을 req.body에 다시 넣고 다음 미들웨어로 진행.
 */
export const validateBody =
  <Schema extends z.ZodTypeAny>(schema: Schema): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed as z.infer<Schema>;
      next();
    } catch (err) {
      next(err);
    }
  };
