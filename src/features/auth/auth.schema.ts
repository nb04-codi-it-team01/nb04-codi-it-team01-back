import { z } from 'zod';
import type { Request, Response } from 'express';
import { NextFunction, RequestHandler } from 'express-serve-static-core';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8), //TODO: 나중에  웹으로 비밀번호 최소 길이 확인
});

export const loginHandler: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: '유효성 검사 에러',
      error: result.error.issues,
    });
  } else {
    req.body = result.data;
    next();
  }
};
