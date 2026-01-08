import { Request, Response } from 'express';

jest.mock('multer-s3', () => {
  return () => ({});
});
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
}));

import { mapImageToBody } from '../../../src/shared/middleware/upload-handler';

describe('Upload Middleware Unit Test', () => {
  describe('mapImageToBody', () => {
    it('req.file이 있으면 req.body에 location 삽입', () => {
      const mockReq = {
        file: { location: 'https://s3.aws.com/image.jpg' },
        body: {},
      } as unknown as Request;

      const mockRes = {} as Response;
      const mockNext = jest.fn();

      const middleware = mapImageToBody('profileImage');
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body['profileImage']).toBe('https://s3.aws.com/image.jpg');
      expect(mockNext).toHaveBeenCalled();
    });

    it('req.file이 없으면 body를 건드리지 않고 통과', () => {
      const mockReq = { body: {} } as Request;
      const mockRes = {} as Response;
      const mockNext = jest.fn();

      const middleware = mapImageToBody('image');
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body['image']).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
