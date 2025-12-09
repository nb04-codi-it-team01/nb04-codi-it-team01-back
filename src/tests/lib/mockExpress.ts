import type { Request, Response, NextFunction } from 'express';

export function createRequestMock(data: Partial<Request> = {}): Request {
  return {
    body: {},
    query: {},
    params: {},
    ...data,
  } as Partial<Request> as Request;
}

export function createResponseMock(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

export function createNextMock(): NextFunction {
  return jest.fn();
}
