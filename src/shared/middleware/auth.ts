import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_ACCESS_TOKEN_SECRET } from '../../lib/constants';
import prisma from '../../lib/prisma';

interface JwtPayload {
  sub: string;
  email?: string;
  iat?: number;
  exp?: number;
}

/**
 * Access Token 인증 미들웨어
 * Authorization 헤더에서 Bearer 토큰을 추출하고 검증
 */
export const accessTokenAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: '인증이 필요합니다.', error: 'Unauthorized' });
    }

    const token = authHeader.substring(7); // "Bearer " 제거

    // 2. JWT 토큰 검증
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_ACCESS_TOKEN_SECRET) as JwtPayload;
    } catch (error) {
      return res.status(401).json({ message: '유효하지 않은 토큰입니다.', error: 'Unauthorized' });
    }

    // 3. DB에서 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      return res.status(401).json({ message: '사용자를 찾을 수 없습니다.', error: 'Unauthorized' });
    }

    // 4. req.user에 사용자 정보 저장
    req.user = {
      id: user.id,
      email: user.email,
      type: user.type,
    };

    next();
  } catch (error) {
    return res.status(500).json({
      message: '인증 처리 중 오류가 발생했습니다.',
      error: 'Internal Server Error',
    });
  }
};
