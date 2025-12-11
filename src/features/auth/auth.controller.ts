import { type Request, type Response, type NextFunction } from 'express';
import { loginDTO } from './auth.dto';
import { AuthService } from './auth.service';
import { JWT_REFRESH_TOKEN_COOKIE_NAME } from '../../lib/constants';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  login = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body as loginDTO;

    const { user, accessToken, refreshToken } = await this.authService.login(email, password);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(201).json({
      user,
      accessToken,
    });
    next();
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return res.status(401).json({ message: '인증이 필요합니다.', error: 'Unauthorized' });
    }

    await this.authService.logout(userId);

    return res.status(200).json({
      status: 200,
      message: '성공으로 로그아웃되었습니다.',
    });
    next();
  };

  handleTokenRefresh = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as { id?: string } | undefined)?.id;
    const refreshTokenFromClient = req.cookies[JWT_REFRESH_TOKEN_COOKIE_NAME];

    if (!userId || !refreshTokenFromClient) {
      return res.status(401).json({ message: '인증이 필요합니다', error: 'Unauthorized' });
    }

    const { accessToken, refreshToken } = await this.authService.refreshTokens(
      userId,
      refreshTokenFromClient,
    );

    return res.status(200).json({
      message: '토큰이 재발급되었습니다.',
      accessToken,
      refreshToken,
    });
    next();
  };
}
