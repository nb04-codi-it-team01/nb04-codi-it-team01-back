import type { User as _User } from '@prisma/client';
declare global {
  namespace Express {
    interface User {
      id?: string;
      email?: string;
      name?: string;
      password: string;
    }
  }
  namespace Request {
    interface User {
      id: string;
      password: string;
    }
  }
}

export {};
