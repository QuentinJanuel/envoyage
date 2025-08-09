import type { DefinedResolution } from "./resolution.js"
import type { EnvironmentRegistry } from "./environment-registry.js"
import type { GetEnvName, GetTag, GetPayload } from "./types.js"
import type { Extends, OptionalIf, RemoveLiteral } from "./utils.js"

/**
 * Represents a single environment variable with definitions for different environments.
 *
 * The Variable class provides a fluent API for defining how a variable should be
 * resolved in different environments. It supports both static resolution methods
 * (hardcoded values, environment variables) and dynamic resolution (runtime values).
 *
 * @template EnvReg - The environment registry type
 * @template N - The name of the variable (must be uppercase)
 * @template DR - The union of all defined resolution types for this variable
 *
 * @example
 * ```typescript
 * const variable = Variable.create("DATABASE_URL")
 *   .for("local", "from-env")
 *   .for("workflows", "from-github-secrets")
 *
 * const workflowVar = Variable.create("IS_WORKFLOW")
 *   .for("local", "hardcoded", "false")
 *   .for("workflows", "hardcoded", "true")
 *
 * const dynamicVar = Variable.create("DOCUMENT_BUCKET")
 *   .dynamicFor("local", "documentBucket")
 * ```
 */
export class Variable<
  EnvReg extends EnvironmentRegistry,
  N extends Uppercase<string> = Uppercase<string>,
  DR extends DefinedResolution<EnvReg> = DefinedResolution<EnvReg>,
> {
  /**
   * Creates a new Variable instance.
   *
   * @param name - The name of the variable (must be uppercase)
   * @param definitions - Array of resolution definitions for different environments
   * @private
   */
  private constructor(
    public name: N,
    public definitions: DR[],
  ) {}

  /**
   * Creates a new Variable with the specified name.
   *
   * @template EnvReg - The environment registry type
   * @template N - The name of the variable (must be uppercase)
   * @param name - The name of the variable (must be uppercase)
   * @returns A new Variable with no environment definitions
   * @internal
   *
   * @example
   * ```typescript
   * const variable = Variable.create("DATABASE_URL")
   * ```
   */
  public static create = <
    EnvReg extends EnvironmentRegistry,
    N extends Uppercase<string>,
  >(name: N) => new Variable<EnvReg, N, never>(name, [])

  /**
   * Defines how this variable should be resolved for a specific environment.
   *
   * The payload parameter is optional and depends on the resolution method type.
   *
   * @template EnvName - The environment name (must be unique across definitions)
   * @template Tag - The resolution method tag for this environment
   * @template Payload - The payload type for this resolution (inferred automatically)
   * @param envName - The environment name to define resolution for
   * @param tag - The resolution method tag (e.g., "hardcoded", "from-env")
   * @param args - Optional payload (required for methods like "hardcoded")
   * @returns A new Variable with the added environment definition
   *
   * @example
   * ```typescript
   * const variable = Variable.create("DATABASE_URL")
   *   .for("local", "from-env") // No payload needed
   *   .for("workflows", "from-github-secrets") // No payload needed
   *
   * const workflowVar = Variable.create("IS_WORKFLOW")
   *   .for("local", "hardcoded", "false") // Payload required
   *   .for("workflows", "hardcoded", "true") // Payload required
   * ```
   */
  public for<
    EnvName extends RemoveLiteral<GetEnvName<EnvReg>, DR["envName"]>,
    Tag extends GetTag<EnvReg, EnvName>,
    Payload extends GetPayload<EnvReg, EnvName, Tag>,
  >(
    envName: EnvName,
    tag: Tag,
    ...args: OptionalIf<Payload, Extends<undefined, Payload>>
  ) {
    const payload = args[0] as Payload
    return new Variable<
      EnvReg,
      N,
      DR | DefinedResolution<
        EnvReg,
        EnvName,
        { type: "user-defined"; tag: Tag; payload: Payload }
      >
    >(
      this.name,
      [
        ...this.definitions,
        { envName, type: { type: "user-defined", tag, payload } },
      ],
    )
  }

  /**
   * Defines this variable to use dynamic resolution for a specific environment.
   *
   * Dynamic resolution allows the variable value to be provided at runtime
   * when creating a resolver, rather than being hardcoded or derived from
   * environment data.
   *
   * @template EnvName - The environment name (must be unique across definitions)
   * @template DynamicName - The name of the dynamic data property
   * @param envName - The environment name to define dynamic resolution for
   * @param dynamicName - The name of the dynamic data property to use
   * @returns A new Variable with the added dynamic environment definition
   *
   * @example
   * ```typescript
   * const variable = Variable.create("DOCUMENT_BUCKET")
   *   .dynamicFor("local", "documentBucket")
   *   .for("workflows", "hardcoded", "my-production-bucket")
   *
   * // When creating a resolver, provide the dynamic data:
   * const resolver = varReg.createResolver("local", envData, {
   *   documentBucket: "my document bucket name"
   * })
   * ```
   */
  public dynamicFor<
    EnvName extends RemoveLiteral<GetEnvName<EnvReg>, DR["envName"]>,
    DynamicName extends string,
  >(
    envName: EnvName,
    dynamicName: DynamicName,
  ) {
    return new Variable<
      EnvReg,
      N,
      DR | DefinedResolution<
        EnvReg,
        EnvName,
        { type: "dynamic"; dynamicName: DynamicName }
      >
    >(
      this.name,
      [
        ...this.definitions,
        { envName, type: { type: "dynamic", dynamicName } },
      ],
    )
  }
}
