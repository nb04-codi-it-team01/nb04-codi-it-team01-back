import { z } from 'zod';
//import type { Request, Response } from 'express';
//import { NextFunction, RequestHandler } from 'express-serve-static-core';

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8), //TODO: 나중에  웹으로 비밀번호 최소 길이 확인
});

export type loginBody = z.infer<typeof loginSchema>;
