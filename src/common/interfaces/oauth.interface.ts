/**
 * Normalised OAuth profile — provider-agnostic.
 *
 * Google gives us `sub` as the ID, GitHub gives us a numeric ID,
 * email may be missing on GitHub (user can hide it), display name
 * format differs. We flatten all of this here so AuthService
 * receives the same shape regardless of provider.
 */
export type OAuthProfile = {
  provider: 'google' | 'github';
  providerId: string; // provider's stable user identifier
  email: string | null; // nullable — GitHub users can hide email
  firstName: string | null;
  lastName: string | null;
  displayName: string;
};

export type OAuthResult = {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    provider: string;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  isNewUser: boolean; // lets the frontend show "Welcome!" vs "Welcome back!"
};
