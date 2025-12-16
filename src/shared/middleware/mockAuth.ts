import type { RequestHandler } from 'express';

export const mockAuth: RequestHandler = (req, _res, next) => {
  req.user = {
    id: 'mock-user-id-001',
    email: 'mock@test.com',
    type: 'BUYER',
  };

  next();
};
