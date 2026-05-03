import { User } from '@prisma/client';
import { TokenPair } from './token.interface';

export type RegisterDTO = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
};

export type LoginDTO = {
  email: string;
  password: string;
};

export type AuthResult = {
  user: Omit<User, 'passwordHash'>;
  tokens: TokenPair;
};

export interface IAuthService {
  register(dto: RegisterDTO): Promise<AuthResult>;
  login(dto: LoginDTO): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<TokenPair>;
  logout(refreshToken: string): Promise<void>;
  logoutAll(userId: string): Promise<void>;
}
