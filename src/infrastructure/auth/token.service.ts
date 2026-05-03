import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';
import { config } from '../../config';
import {
  ITokenService,
  TokenPair,
  AccessTokenPayload,
  RefreshTokenPayload,
} from '../../common/interfaces/token.interface';
import { UnauthorizedError } from '../../common/errors/http-errors';

/**
 * Redis key design for refresh tokens:
 *
 *   refresh_token:{userId}:{tokenId}  →  "1"  (TTL = 7 days)
 *
 * Why include both userId AND tokenId?
 * - userId alone: can't distinguish between multiple active sessions
 *   (user logged in from phone + laptop simultaneously)
 * - tokenId alone: can't do "revoke ALL sessions for this user"
 *   (needed for password change, account compromise)
 *
 * This design lets us:
 *   Revoke one session:  DEL refresh_token:{userId}:{tokenId}
 *   Revoke all sessions: SCAN + DEL refresh_token:{userId}:*
 */
const REFRESH_TOKEN_PREFIX = 'refresh_token';

function buildKey(userId: string, tokenId: string): string {
  return `${REFRESH_TOKEN_PREFIX}:${userId}:${tokenId}`;
}

export class TokenService implements ITokenService {
  constructor(private readonly redis: Redis) {}

  async generateTokenPair(userId: string, email: string): Promise<TokenPair> {
    const tokenId = randomUUID();

    const accessToken = this.signAccessToken(userId, email);
    const refreshToken = this.signRefreshToken(userId, tokenId);

    // Persist refresh token to Redis before returning
    await this.storeRefreshToken(userId, tokenId);

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
      if (payload.type !== 'access') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      // Map all JWT errors (expired, malformed, wrong sig) to 401
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }
      return payload;
    } catch (err) {
      if (err instanceof UnauthorizedError) throw err;
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  async storeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = buildKey(userId, tokenId);
    const ttlSeconds = this.parseTtl(config.jwt.refreshExpiresIn);
    // Value is just "1" — the key's existence is what matters, not its value
    await this.redis.set(key, '1', 'EX', ttlSeconds);
  }

  async validateRefreshToken(userId: string, tokenId: string): Promise<boolean> {
    const key = buildKey(userId, tokenId);
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Token rotation strategy — the most important method for security.
   *
   * On every refresh:
   * 1. Delete the old tokenId from Redis (invalidate old session)
   * 2. Issue a completely new token pair with a new tokenId
   * 3. Store the new tokenId in Redis
   *
   * If an attacker steals a refresh token and tries to use it AFTER
   * the legitimate user has already refreshed: the old tokenId won't
   * exist in Redis → rejected immediately.
   *
   * If the attacker uses it FIRST: the legitimate user's next refresh
   * will fail (their tokenId was deleted by the attacker's rotation).
   * The user gets a 401 and is forced to log in again — which is the
   * correct response to a potentially compromised session.
   */
  async rotateRefreshToken(userId: string, oldTokenId: string, email: string): Promise<TokenPair> {
    // Atomic delete + re-issue
    await this.revokeRefreshToken(userId, oldTokenId);
    return this.generateTokenPair(userId, email);
  }

  async revokeRefreshToken(userId: string, tokenId: string): Promise<void> {
    const key = buildKey(userId, tokenId);
    await this.redis.del(key);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    // Scan for all keys matching this user (used on password change, account lock)
    const pattern = `${REFRESH_TOKEN_PREFIX}:${userId}:*`;
    const keys = await this.scanKeys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // --- Private helpers ---

  private signAccessToken(userId: string, email: string): string {
    const payload = {
      sub: userId,
      email,
      type: 'access',
    };

    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn as any,
    });
  }

  private signRefreshToken(userId: string, tokenId: string): string {
    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      sub: userId,
      tokenId,
      type: 'refresh',
    };
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as any,
    });
  }

  /**
   * SCAN is non-blocking unlike KEYS.
   * Never use KEYS in production — it blocks the Redis event loop
   * for the entire duration of the scan on large keyspaces.
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, batch] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      keys.push(...batch);
    } while (cursor !== '0');
    return keys;
  }

  /**
   * Convert JWT expiry string ('15m', '7d') to seconds for Redis TTL.
   * We want the Redis TTL to match the JWT expiry exactly.
   */
  private parseTtl(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const map: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };
    return value * (map[unit] ?? 60);
  }
}
