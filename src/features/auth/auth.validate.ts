import { z } from 'zod';
import type { Request, Response } from 'express';
import { RequestHandler } from 'express-serve-static-core';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8), //TODO: 나중에  웹으로 비밀번호 최소 길이 확인
});

export const loginHandler: RequestHandler = (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: '유효성 검사 에러',
      error: result.error.issues,
    });
  } else {
    const { _email, _password } = result.data;
    res.json({ _email, _password });
  }
};
