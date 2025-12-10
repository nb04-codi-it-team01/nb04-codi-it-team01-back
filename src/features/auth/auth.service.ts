import { AuthRepository } from './auth.repository';
//import type { loginDTO } from './auth.dto.js';
import { generateToken } from '../../lib/generate-token';
export class AuthService {
  constructor(private repository: AuthRepository) {
    this.repository = repository; //초기화
  }
  async login(
    userId: string,
    //elements: loginDTO,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    //const { email } = elements;

    const { accessToken, refreshToken } = generateToken(userId);
    return { accessToken, refreshToken };
  }
}
