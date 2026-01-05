process.env.AWS_BUCKET_NAME = 'test-bucket';

import { fileFilter } from '../../../src/shared/middleware/upload-handler';
import { AppError } from '../../../src/shared/middleware/error-handler';

describe('Upload Middleware - FileFilter', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const req = {} as any; // req는 안 쓰므로 대충

  it('성공: 이미지 파일(png, jpeg)은 통과시켜야 한다', () => {
    const file = { mimetype: 'image/png' } as Express.Multer.File;
    const cb = jest.fn();

    fileFilter(req, file, cb);

    // cb(null, true)가 호출되었는지 확인
    expect(cb).toHaveBeenCalledWith(null, true);
  });

  it('실패: 이미지가 아닌 파일(pdf)은 에러를 내야 한다', () => {
    const file = { mimetype: 'application/pdf' } as Express.Multer.File;
    const cb = jest.fn();

    fileFilter(req, file, cb);

    // cb(Error)가 호출되었는지 확인
    expect(cb).toHaveBeenCalledWith(expect.any(AppError));
    const error = (cb as jest.Mock).mock.calls[0][0];
    expect(error.message).toContain('이미지 파일만');
  });
});
