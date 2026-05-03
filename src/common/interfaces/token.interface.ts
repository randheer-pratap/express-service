export type AccessTokenPayload = {
  sub: string; // userId — "sub" is the JWT standard claim for subject
  email: string;
  type: 'access';
};

export type RefreshTokenPayload = {
  sub: string; // userId
  tokenId: string; // UUID — identifies this specific refresh token in Redis
  type: 'refresh';
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export interface ITokenService {
  generateTokenPair(userId: string, email: string): Promise<TokenPair>;
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyRefreshToken(token: string): RefreshTokenPayload;
  storeRefreshToken(userId: string, tokenId: string): Promise<void>;
  validateRefreshToken(userId: string, tokenId: string): Promise<boolean>;
  rotateRefreshToken(userId: string, oldTokenId: string, email: string): Promise<TokenPair>;
  revokeRefreshToken(userId: string, tokenId: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
}
