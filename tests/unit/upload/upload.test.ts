import request from 'supertest';
import express, { NextFunction, Request, Response } from 'express';
import { mapImageToBody } from '../../../src/shared/middleware/upload-handler';
import { AppError } from '../../../src/shared/middleware/error-handler';
import uploadRouter from '../../../src/features/upload/upload.router';

interface S3UploadResult {
  location: string;
  key: string;
}

type MulterCallback = (error: Error | null, info?: S3UploadResult) => void;

// multer-s3를 통째로 모킹
jest.mock('multer-s3', () => {
  return () => ({
    _handleFile: (_req: Request, file: Express.Multer.File, cb: MulterCallback) => {
      file.stream.resume();
      cb(null, {
        location: `https://fake-s3-url.com/${file.originalname}`,
        key: `upload/${file.originalname}`,
      });
    },
    _removeFile: (_req: Request, _file: Express.Multer.File, cb: MulterCallback) => cb(null),
  });
});

// S3Client도 모킹
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
}));

describe('Upload Middleware', () => {
  describe('mapImageToBody', () => {
    it('req.file이 있으면 req.body에 location을 넣어야 함', () => {
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

    it('req.file이 없으면 통과', () => {
      const mockReq = { body: {} } as Request;
      const mockRes = {} as Response;
      const mockNext = jest.fn();

      const middleware = mapImageToBody('image');
      middleware(mockReq, mockRes, mockNext);

      expect(mockReq.body['image']).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Upload API Integration', () => {
    let app: express.Express;

    beforeAll(() => {
      app = express();
      app.use(express.json());

      app.use(uploadRouter);

      app.use((err: AppError, req: Request, res: Response, _next: NextFunction) => {
        const status = err.statusCode || 500;
        res.status(status).json({ message: err.message });
      });
    });

    it('POST /s3/upload - 이미지를 업로드하면 S3 URL과 201 응답', async () => {
      const fakeImage = Buffer.from('fake-image-content');

      const res = await request(app).post('/s3/upload').attach('image', fakeImage, 'profile.png');

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        message: '업로드 성공',
        url: 'https://fake-s3-url.com/profile.png',
        key: 'upload/profile.png',
      });
    });

    it('POST /s3/upload - 파일이 없으면 400 에러', async () => {
      const res = await request(app).post('/s3/upload');

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('파일이 없습니다.');
    });

    it('POST /s3/upload - 허용되지 않은 확장자(txt)를 업로드하면 415 에러', async () => {
      const fakeText = Buffer.from('hello world');

      const res = await request(app).post('/s3/upload').attach('image', fakeText, 'test.txt');

      expect(res.status).toBe(415);
      expect(res.body.message).toBe('이미지 파일만 업로드할 수 있습니다.');
    });
  });
});
