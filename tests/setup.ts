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

// 로컬 파일 업로드 사용 (S3 대신)
process.env.USE_LOCAL_UPLOAD = 'true';
process.env.LOCAL_UPLOAD_DIR = 'test-uploads';

// AWS 설정 (사용하지 않지만 필수값이므로 더미 값)
process.env.AWS_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'ap-northeast-2';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

// 기타 설정
process.env.FRONTEND_URL = 'http://localhost:3000';
