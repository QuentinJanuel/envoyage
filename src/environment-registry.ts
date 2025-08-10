import * as e from "./environment.js"
import type * as res from "./resolution.js"
import type * as td from "./type-def.js"
import type * as u from "./utils.js"
import * as v from "./variable-registry.js"

/**
 * Registry for managing multiple environments with their resolutions.
 *
 * This class provides a fluent API for building environment configurations.
 * Each environment can have multiple resolution methods (hardcoded, from-env, etc.)
 * and the registry ensures type safety across all environments.
 *
 * @template Env - The union of all environment types in the registry
 *
 * @example
 * ```typescript
 * const envReg = createEnvironmentRegistry()
 *   .addEnv("local", defineType<{ env: Record<string, string> }>(), (env) => env
 *     .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
 *     .addResolution("from-env", defineType<undefined>(), (data) =>
 *       data.envData.env[data.variableName]))
 * ```
 */
export class EnvironmentRegistry<
  Env extends e.Environment = e.Environment,
> {
  /**
   * Creates a new EnvironmentRegistry instance.
   *
   * @param environments - Array of environment configurations
   * @private
   */
  private constructor(
    public environments: Env[],
  ) {}

  /**
   * Adds a new environment to the registry.
   *
   * This method ensures type safety by preventing duplicate environment names
   * and maintaining the union type of all environments.
   *
   * @template EnvName - The name of the environment (must be unique)
   * @template EnvData - The data structure for this environment
   * @template R - The union of all resolution types for this environment
   *
   * @param envName - The unique name for this environment
   * @param _envDataType - Type definition for the environment data (used for type inference)
   * @param f - Function that configures the environment with its resolutions
   * @returns A new EnvironmentRegistry with the added environment
   *
   * @example
   * ```typescript
   * const envReg = createEnvironmentRegistry()
   *   .addEnv("local", defineType<{ env: Record<string, string> }>(), (env) => env
   *     .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
   *     .addResolution("from-env", defineType<undefined>(), (data) =>
   *       data.envData.env[data.variableName]))
   * ```
   */
  public addEnv<
    EnvName extends string,
    EnvData,
    R extends res.Resolution<string, EnvData>,
  >(
    envName: u.RemoveLiteral<EnvName, Env["name"]>,
    _envDataType: td.TypeDef<EnvData>,
    f: (
      env: e.Environment<EnvName, EnvData, never>
    ) => e.Environment<EnvName, EnvData, R>,
  ) {
    return new EnvironmentRegistry<Env | e.Environment<EnvName, EnvData, R>>([
      ...this.environments,
      f(e.Environment.create<EnvName, EnvData>(envName)),
    ])
  }

  /**
   * Creates a new empty EnvironmentRegistry.
   *
   * @returns A new EnvironmentRegistry with no environments
   * @internal
   *
   * @example
   * ```typescript
   * const envReg = EnvironmentRegistry.create()
   * ```
   */
  public static create() {
    return new EnvironmentRegistry<never>([])
  }

  /**
   * Creates a VariableRegistry that can define variables for this environment registry.
   *
   * The VariableRegistry will have full type safety for all environments
   * and resolutions defined in this registry.
   *
   * @returns A new VariableRegistry configured for this environment registry
   *
   * @example
   * ```typescript
   * const varReg = envReg.createVariableRegistry()
   *   .addVar("DATABASE_URL", (v) => v
   *     .for("local", "from-env")
   *     .for("workflows", "from-github-secrets"))
   * ```
   */
  public createVariableRegistry() {
    return v.VariableRegistry.create(this)
  }
}

/**
 * Creates a new EnvironmentRegistry.
 *
 * @returns A new empty EnvironmentRegistry
 *
 * @example
 * ```typescript
 * const envReg = createEnvironmentRegistry()
 *   .addEnv("local", defineType<{ env: Record<string, string> }>(), (env) => env
 *     .addResolution("hardcoded", defineType<string>(), (data) => data.payload))
 * ```
 */
export const createEnvironmentRegistry = () => EnvironmentRegistry.create()
