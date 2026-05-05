import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { config } from '../../../config';
import { OAuthProfile } from '../../../common/interfaces/oauth.interface';
import { container } from '../../../container';
import { TOKENS } from '../../../container/tokens';
import { IAuthService } from '../../../common/interfaces/auth.interface';

/**
 * Why we don't use passport.serializeUser / passport.deserializeUser:
 *
 * Those are for session-based auth where Passport stores the user
 * in a server-side session between requests. We are stateless — we
 * use JWTs, not sessions. So we skip serialization entirely and
 * just attach the OAuthResult to req.user inside the verify callback,
 * then read it in the route handler.
 */
export function registerGoogleStrategy(): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.callbackUrl,
        // Request only what you need — principle of least privilege
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile: Profile, done) => {
        /**
         * This verify callback runs after Google confirms the user.
         * _accessToken and _refreshToken are Google's tokens — we
         * deliberately ignore them. We only need the profile.
         */
        try {
          const normalised: OAuthProfile = {
            provider: 'google',
            // profile.id is Google's stable identifier (the "sub" claim)
            providerId: profile.id,
            email: profile.emails?.[0]?.value ?? null,
            firstName: profile.name?.givenName ?? null,
            lastName: profile.name?.familyName ?? null,
            displayName: profile.displayName,
          };

          const authService = container.resolve<IAuthService>(TOKENS.AuthService);
          const result = await authService.handleOAuthLogin(normalised);

          // done(error, user) — passing result as "user" so it's on req.user
          done(null, result);
        } catch (err) {
          done(err instanceof Error ? err : new Error(String(err)));
        }
      },
    ),
  );
}
