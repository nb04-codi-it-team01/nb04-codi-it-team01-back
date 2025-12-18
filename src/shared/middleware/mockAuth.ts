import type { RequestHandler } from 'express';

export const mockAuth: RequestHandler = (req, _res, next) => {
  req.user = {
    id: 'user_buyer_1',
    email: 'buyer1@example.com',
    type: 'BUYER',
  };

  next();
};
