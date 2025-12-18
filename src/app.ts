import express from 'express';
import cookieParser from 'cookie-parser';
import passport from './lib/passport/index';
import authRoute from './features/auth/auth.routes';
import cors from 'cors';
import productRoute from './features/product/product.route';
import userRoute from './features/user/user.route';
import storeRoute from './features/store/store.route';
import cartRoute from './features/cart/cart.route';
import { requestLogger } from './shared/middleware/logger';
import { errorHandler } from './shared/middleware/error-handler';
import reviewRoute from './features/review/review.route';

export const app = express();

app.use(cookieParser());
// CORS 설정 - 프론트엔드(3000)에서 접근 허용
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(requestLogger);

// // ================== 임시 하드코딩 ==================

// // 1. 내 좋아요 목록 (빈 배열)
// app.get('/api/users/me/likes', (req, res) => {
//   return res.status(200).json([]);
// });

// // 2. 내 스토어 정보 (추가됨!)
// // 401 에러를 막기 위해 '스토어 없음(null)' 상태를 리턴합니다.
// app.get('/api/stores/detail/my', (req, res) => {
//   return res.status(200).json(null);
// });

// // 3. 장바구니 (빈 배열)
// app.get('/api/cart', (req, res) => {
//   res.status(200).json({ items: [] });
// });

// // 4. 알림 목록 (빈 배열)
// app.get('/api/notifications', (req, res) => {
//   res.status(200).json([]);
// });

// // 5. 알림 SSE (무한 재접속 방지 수정!)
// // res.send()를 쓰면 연결이 끊기므로, res.write()를 쓰고 연결을 유지시킵니다.
// app.get('/api/notifications/sse', (req, res) => {
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');
//   res.flushHeaders(); // 헤더를 즉시 전송

//   // 데이터를 보내고 res.end()를 하지 않아야 연결이 유지됩니다.
//   res.write('data: connected\n\n');

//   // (선택사항) 클라이언트가 연결을 끊을 때까지 대기
//   req.on('close', () => {
//     res.end();
//   });
// });
// // ======================================================================

app.use('/api', authRoute);
app.use('/api', productRoute);
app.use('/api', userRoute);
app.use('/api', storeRoute);
app.use('/api', reviewRoute);
app.use('/api', cartRoute);

app.use(errorHandler);
