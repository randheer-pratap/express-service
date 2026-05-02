import { Token } from './tokens';

/**
 * Descriptor for a registered binding.
 *
 * - `factory`: a function that receives the container and returns
 *   the instance. This is what gets called on resolution.
 * - `singleton`: if true, the instance is created once and cached.
 *   If false, a new instance is created on every resolve() call.
 * - `instance`: the cached singleton instance (set after first resolution).
 */
type Binding<T> = {
  factory: (container: Container) => T;
  singleton: boolean;
  instance?: T;
};

/**
 * IoC Container — the dependency registry and resolver.
 *
 * Design decisions:
 * 1. Factory-based binding: we store a factory function, not the
 *    instance itself. This means dependencies are resolved lazily
 *    (only when first needed), not eagerly at registration time.
 *    This prevents circular dependency crashes during startup.
 *
 * 2. Singleton scope by default: most services should be singletons.
 *    A new Logger or UserService per request is wasteful. The container
 *    caches the first resolved instance and returns it on subsequent calls.
 *
 * 3. Transient scope available: for cases where you genuinely need a
 *    fresh instance each time (e.g., a per-request context object).
 */
export class Container {
  private readonly bindings = new Map<Token, Binding<unknown>>();

  /**
   * Register a factory function for a token.
   * The factory receives the container itself — this is how
   * nested dependencies are resolved recursively.
   */
  bind<T>(token: Token, factory: (container: Container) => T, singleton = true): this {
    this.bindings.set(token, { factory, singleton } as Binding<unknown>);
    return this; // fluent API for chaining
  }

  /**
   * Register a pre-constructed value (e.g., config, a DB client
   * that's already been instantiated before the container was set up).
   */
  bindValue<T>(token: Token, value: T): this {
    this.bindings.set(token, {
      factory: () => value,
      singleton: true,
      instance: value,
    } as Binding<unknown>);
    return this;
  }

  /**
   * Resolve a token to its concrete implementation.
   *
   * Resolution algorithm:
   * 1. Look up the binding for this token.
   * 2. If it's a singleton and already instantiated, return cached instance.
   * 3. Otherwise, call the factory (which may recursively resolve its own deps).
   * 4. Cache the instance if singleton.
   */
  resolve<T>(token: Token): T {
    const binding = this.bindings.get(token) as Binding<T> | undefined;

    if (!binding) {
      throw new Error(
        `[Container] No binding found for token: ${token.toString()}. ` +
          `Did you forget to register it in the container?`,
      );
    }

    if (binding.singleton && binding.instance !== undefined) {
      return binding.instance;
    }

    const instance = binding.factory(this);

    if (binding.singleton) {
      binding.instance = instance;
    }

    return instance;
  }

  /**
   * Check if a token has been registered.
   * Useful for optional dependencies or feature flags.
   */
  has(token: Token): boolean {
    return this.bindings.has(token);
  }

  /**
   * Clear all bindings and cached instances.
   * Used in tests to reset container state between test suites.
   */
  reset(): void {
    this.bindings.clear();
  }
}

// Export a single container instance for the application.
// This is the "composition root" — one place where everything is wired.
export const container = new Container();
