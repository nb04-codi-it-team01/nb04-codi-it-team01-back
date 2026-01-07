/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Jest 테스트 환경 설정
 */

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';

// 테스트용 로컬 DB 사용
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/project3db_test';

// JWT 시크릿
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing';

// AWS 설정 (더미 값 - 실제로는 모킹됨)
process.env.AWS_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

// 기타 설정
process.env.FRONTEND_URL = 'http://localhost:3000';

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
