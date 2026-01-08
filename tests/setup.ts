/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Jest 테스트 환경 설정
 */

import dotenv from 'dotenv';
import path from 'path';

// .env.test 파일 로드
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

/**
 * S3 모킹 (multer-s3)
 * 실제 S3 업로드 대신 fake URL 반환
 */
interface S3UploadResult {
  location: string;
  key: string;
}
type MulterCallback = (error: Error | null, info?: S3UploadResult) => void;

jest.mock('multer-s3', () => {
  return () => ({
    _handleFile: (_req: any, file: any, cb: MulterCallback) => {
      file.stream.resume();
      cb(null, {
        location: `https://fake-s3-url.com/${file.originalname}`,
        key: `upload/${file.originalname}`,
      });
    },
    _removeFile: (_req: any, _file: any, cb: MulterCallback) => cb(null),
  });
});

/**
 * S3Client 모킹 (@aws-sdk/client-s3)
 */
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
}));
