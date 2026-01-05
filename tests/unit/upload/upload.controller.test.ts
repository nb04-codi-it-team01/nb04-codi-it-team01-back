import { postUpload } from '../../../src/features/upload/upload.controller';
import httpMocks from 'node-mocks-http';
import { NextFunction } from 'express';

describe('Upload Controller', () => {
  it('성공 시: S3 URL과 201 상태 코드를 반환해야 한다', async () => {
    // 1. 가짜 Request 생성
    const req = httpMocks.createRequest({
      file: {
        location: 'https://s3-url.com/image.jpg', // S3가 주는 URL
        key: 'image.jpg',
        size: 1024,
      } as Express.MulterS3.File, // 타입 단언
    });
    const res = httpMocks.createResponse();
    const next = jest.fn() as NextFunction;

    // 2. 컨트롤러 실행
    await postUpload(req, res, next);

    // 3. 검증
    expect(res.statusCode).toBe(201); // 201 Created 확인
    expect(res._getJSONData()).toEqual({
      message: '업로드 성공',
      url: 'https://s3-url.com/image.jpg',
      key: 'image.jpg',
    });
  });

  it('실패 시: 파일이 없으면 400 에러를 던져야 한다', async () => {
    // 1. 파일이 없는 가짜 Request
    const req = httpMocks.createRequest({
      file: undefined,
    });
    const res = httpMocks.createResponse();
    const next = jest.fn() as NextFunction;

    // 2. 실행
    await postUpload(req, res, next);

    // 3. 검증 (next가 에러와 함께 호출되었는지)
    expect(next).toHaveBeenCalled();
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error.status).toBe(400);
    expect(error.message).toBe('파일이 없습니다.');
  });
});
