import dotenv from 'dotenv';

dotenv.config(); // 환경변수 적재

const NODE_ENV = process.env.NODE_ENV;
const PORT = process.env.PORT || 3000;
const JWT_ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_TOKEN_SECRET || 'your_jwt_access_token_secret';
const JWT_REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_TOKEN_SECRET || 'your_jwt_refresh_token_secret';
const JWT_ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
const JWT_REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
// 환경변수에 있는 s3 넣는다
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'your_aws_access_key_id';
const AWS_SECRET_KEY = process.env.AWS_SECRET_KEY || 'your_aws_secret_key';
const AWS_BUCKET_REGION = process.env.AWS_BUCKET_REGION || 'your_bucket_region';
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME || 'your_aws_bucket_name';

export {
  NODE_ENV,
  PORT,
  JWT_ACCESS_TOKEN_SECRET,
  JWT_REFRESH_TOKEN_SECRET,
  JWT_ACCESS_TOKEN_COOKIE_NAME,
  JWT_REFRESH_TOKEN_COOKIE_NAME,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_KEY,
  AWS_BUCKET_REGION,
  AWS_BUCKET_NAME,
};
