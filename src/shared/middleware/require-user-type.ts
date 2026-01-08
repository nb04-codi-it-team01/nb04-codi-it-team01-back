import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { AuthUser, UserType } from '../types/auth';
import { AppError } from './error-handler';

/**
 * 유저 타입(역할)에 따라 접근을 제한하는 범용 미들웨어.
 *
 * 예:
 *   - requireUserType('SELLER') → 판매자만 허용
 *   - requireUserType('BUYER')  → 구매자만 허용
 *   - requireUserType('BUYER', 'SELLER') → 둘 다 허용
 */
export const requireUserType =
  (...allowed: UserType[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user as AuthUser | undefined;

    if (!user) {
      return next(new AppError(401, '인증이 필요합니다.', 'Unauthorized'));
    }

    if (!allowed.includes(user.type)) {
      const message =
        allowed.length === 1 && allowed[0] === 'SELLER'
          ? '이 기능은 판매자만 이용할 수 있습니다.'
          : allowed.length === 1 && allowed[0] === 'BUYER'
            ? '이 기능은 구매자만 이용할 수 있습니다.'
            : '해당 기능을 이용할 권한이 없습니다.';

      return next(new AppError(403, message, 'Forbidden'));
    }

    next();
  };
