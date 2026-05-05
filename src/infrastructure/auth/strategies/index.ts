import { registerGoogleStrategy } from './google.strategy';
import { registerGitHubStrategy } from './github.strategy';

/**
 * Call once at startup, before any routes are registered.
 * Idempotent — safe to call multiple times (Passport deduplicates).
 */
export function registerOAuthStrategies(): void {
  registerGoogleStrategy();
  registerGitHubStrategy();
}
