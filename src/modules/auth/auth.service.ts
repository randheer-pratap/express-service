import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import {
  IAuthService,
  RegisterDTO,
  LoginDTO,
  AuthResult,
} from '../../common/interfaces/auth.interface';
import { ITokenService } from '../../common/interfaces/token.interface';
import { IUserRepository, CreateUserDTO } from '../../common/interfaces/user.interface';
import { ILogger } from '../../common/interfaces/logger.interface';
import { ConflictError, UnauthorizedError } from '../../common/errors/http-errors';
import { TokenPair } from '../../common/interfaces/token.interface';

const BCRYPT_ROUNDS = 12; // 12 rounds = ~300ms on modern hardware — the right tradeoff

export class AuthService implements IAuthService {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly logger: ILogger,
  ) {}

  async register(dto: RegisterDTO): Promise<AuthResult> {
    this.logger.info('AuthService.register', { email: dto.email });

    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      // Do NOT reveal whether an email exists in a real system.
      // For this tutorial, ConflictError is fine — in production
      // you'd return 200 and send a "if this email is registered..." email.
      throw new ConflictError(`Email ${dto.email} is already registered`, 'EMAIL_ALREADY_EXISTS');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const userData: Omit<CreateUserDTO, 'passwordHash'> = {
      email: dto.email,
      provider: 'local',
    };
    if (dto.firstName) userData.firstName = dto.firstName;
    if (dto.lastName) userData.lastName = dto.lastName;

    const user = await this.userRepository.create({
      ...userData,
      passwordHash,
    });

    const tokens = await this.tokenService.generateTokenPair(user.id, user.email);

    return { user: this.sanitizeUser(user), tokens };
  }

  async login(dto: LoginDTO): Promise<AuthResult> {
    this.logger.info('AuthService.login', { email: dto.email });

    const user = await this.userRepository.findByEmail(dto.email);

    /**
     * Constant-time comparison to prevent timing attacks.
     *
     * If we return immediately on "user not found", an attacker can
     * measure response time to enumerate valid emails: a missing user
     * returns in 1ms, a wrong password takes 300ms (bcrypt).
     *
     * By always running bcrypt.compare (against a dummy hash when user
     * is missing), every login attempt takes the same time regardless
     * of whether the email exists.
     */
    const dummyHash = '$2a$12$invalidhashfortimingnormalization000000000000000000000';
    const passwordToCheck = user?.passwordHash ?? dummyHash;
    const isValid = await bcrypt.compare(dto.password, passwordToCheck);

    if (!user || !isValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = await this.tokenService.generateTokenPair(user.id, user.email);

    return { user: this.sanitizeUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    // Step 1: verify the JWT signature and expiry
    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    // Step 2: verify the tokenId exists in Redis (stateful check)
    const isValid = await this.tokenService.validateRefreshToken(payload.sub, payload.tokenId);

    if (!isValid) {
      /**
       * Token is not in Redis. Two possible causes:
       * 1. User already logged out (expected)
       * 2. Token was already rotated — possible replay attack
       *
       * Either way: revoke ALL tokens for this user as a safety measure.
       * If it's a replay attack, the attacker's new tokens are also killed.
       * If it's an accident, the user just needs to log in again.
       */
      this.logger.warn('Refresh token not found in Redis — possible replay attack', {
        userId: payload.sub,
      });
      await this.tokenService.revokeAllUserTokens(payload.sub);
      throw new UnauthorizedError('Refresh token is invalid or has been revoked');
    }

    // Step 3: rotate — delete old, issue new pair
    const user = await this.userRepository.findById(payload.sub);
    if (!user) throw new UnauthorizedError('User no longer exists');

    return this.tokenService.rotateRefreshToken(payload.sub, payload.tokenId, user.email);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.tokenService.verifyRefreshToken(refreshToken);
      await this.tokenService.revokeRefreshToken(payload.sub, payload.tokenId);
      this.logger.info('AuthService.logout', { userId: payload.sub });
    } catch {
      // If token is already expired/invalid, logout is still "successful"
      // from the user's perspective — we just can't revoke what doesn't exist
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
    this.logger.info('AuthService.logoutAll', { userId });
  }

  /**
   * Never return passwordHash to any caller.
   * Enforced at the type level — callers receive Omit<User, 'passwordHash'>
   */
  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _, ...sanitized } = user;
    return sanitized;
  }
}
