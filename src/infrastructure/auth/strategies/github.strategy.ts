import passport from 'passport';
import { Strategy as GitHubStrategy, Profile } from 'passport-github2';
import { config } from '../../../config';
import { OAuthProfile } from '../../../common/interfaces/oauth.interface';
import { container } from '../../../container';
import { TOKENS } from '../../../container/tokens';
import { IAuthService } from '../../../common/interfaces/auth.interface';

export function registerGitHubStrategy(): void {
  passport.use(
    new GitHubStrategy(
      {
        clientID: config.oauth.github.clientId,
        clientSecret: config.oauth.github.clientSecret,
        callbackURL: config.oauth.github.callbackUrl,
        // 'user:email' scope is required to access email —
        // GitHub doesn't include it in the basic profile scope
        scope: ['user:email'],
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (err: Error | null, user?: unknown) => void,
      ) => {
        try {
          /**
           * GitHub email quirk: profile.emails can be an array of
           * email objects with a `primary` flag. We want the primary
           * verified email, falling back to the first available.
           */
          const primaryEmail =
            profile.emails?.find((e) => (e as { primary?: boolean }).primary)?.value ??
            profile.emails?.[0]?.value ??
            null;

          const [firstName, ...rest] = (profile.displayName ?? '').split(' ');
          const lastName = rest.join(' ') || null;

          const normalised: OAuthProfile = {
            provider: 'github',
            providerId: String(profile.id),
            email: primaryEmail,
            firstName: firstName ?? null,
            lastName,
            displayName: profile.displayName ?? profile.username ?? '',
          };

          const authService = container.resolve<IAuthService>(TOKENS.AuthService);
          const result = await authService.handleOAuthLogin(normalised);

          done(null, result);
        } catch (err) {
          done(err instanceof Error ? err : new Error(String(err)));
        }
      },
    ),
  );
}
