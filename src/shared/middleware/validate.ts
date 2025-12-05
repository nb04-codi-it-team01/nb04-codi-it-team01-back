import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ParsedQs } from 'qs';
import { z } from 'zod';

/**
 * Zod 스키마로 req.body를 검증하는 미들웨어.
 *
 * - 요청 본문(req.body)을 스키마로 검증/파싱한다.
 * - 검증 실패 시 ZodError를 next(err)로 넘겨 전역 errorHandler에서 400 응답 처리.
 * - 검증 성공 시 파싱된 안전한 값을 req.body에 다시 할당한 뒤 다음 미들웨어로 진행한다.
 */
export const validateBody =
  <Schema extends z.ZodTypeAny>(schema: Schema): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.body);
      // 이후 미들웨어/컨트롤러에서는 req.body를 z.infer<Schema>로 간주 가능
      req.body = parsed as z.infer<Schema>;
      next();
    } catch (err) {
      next(err);
    }
  };

/**
 * Zod 스키마로 req.params를 검증하는 미들웨어.
 *
 * - 라우트 파라미터(req.params)를 스키마로 검증/파싱한다.
 * - 검증 실패 시 ZodError를 next(err)로 넘겨 전역 errorHandler에서 처리.
 * - 검증 성공 시 파싱된 값을 req.params에 다시 넣고 다음 미들웨어로 진행한다.
 *
 * @example
 *   router.get(
 *     '/products/:productId',
 *     validateParams(productIdParamSchema),
 *     controller.getProductDetail,
 *   );
 */
export const validateParams =
  <Schema extends z.ZodTypeAny>(schema: Schema): RequestHandler<z.infer<Schema>> =>
  (req, _res, next) => {
    const parsed = schema.parse(req.params);
    req.params = parsed;
    next();
  };

/**
 * Zod 스키마로 req.query를 검증하는 미들웨어.
 *
 * - 쿼리스트링(req.query)을 스키마로 검증/파싱한다.
 * - 검증 실패 시 ZodError를 next(err)로 넘겨 전역 errorHandler에서 400 응답 처리.
 * - 검증 성공 시 파싱된 값을 req.query에 다시 넣고 다음 미들웨어로 진행한다.
 *
 * 주의:
 * - Express의 Request 타입에서 req.query는 기본적으로 ParsedQs로 정의되어 있기 때문에,
 *   여기서는 parsed 값을 unknown → ParsedQs로 한 번 단언하여 타입을 맞춰준다.
 *   (런타임 동작에는 영향 없고, 타입스크립트에게 “이 구조를 query로 써도 된다”고 알려주는 역할)
 *
 * @example
 *   router.get(
 *     '/products',
 *     validateQuery(getProductsQuerySchema),
 *     controller.getProducts,
 *   );
 */
export const validateQuery =
  <Schema extends z.ZodTypeAny>(schema: Schema): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req.query) as z.infer<Schema>;

      // Express 타입 정의(req.query: ParsedQs)와 Zod 결과 타입을 연결하기 위한 단언
      req.query = parsed as unknown as ParsedQs;

      next();
    } catch (err) {
      next(err);
    }
  };
