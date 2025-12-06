import { AuthRepository } from './auth.repository.js';
import type { loginDTO } from './auth.dto.js';
export class AuthService {
  constructor(private repository: AuthRepository) {
    this.repository = repository;
  }
  async login(elements: loginDTO) {
    const { email, password } = elements;

    return result;
  }
  async logout(_userId, refreshToken) {}

  async handleTokenRefresh(refreshToken) {}
}
