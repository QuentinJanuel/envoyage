import type * as er from "./environment-registry.js"
import type * as t from "./types.js"
import * as r from "./resolver.js"
import type * as res from "./resolution.js"
import * as v from "./variable.js"
import type * as u from "./utils.js"

/**
 * Registry for managing variable definitions across multiple environments.
 *
 * The VariableRegistry provides a fluent API for defining variables and their
 * resolution methods for different environments. It ensures type safety by
 * preventing duplicate variable names and validating environment references.
 *
 * @template EnvReg - The environment registry type
 * @template Var - The union of all variable types in the registry
 *
 * @example
 * ```typescript
 * const varReg = envReg.createVariableRegistry()
 *   .addVar("DATABASE_URL", (v) => v
 *     .for("local", "from-env")
 *     .for("workflows", "from-github-secrets"))
 *   .addVar("IS_WORKFLOW", (v) => v
 *     .for("local", "hardcoded", "false")
 *     .for("workflows", "hardcoded", "true"))
 *   .addVar("DOCUMENT_BUCKET", (v) => v
 *     .dynamicFor("local", "documentBucket"))
 * ```
 */
export class VariableRegistry<
  EnvReg extends er.EnvironmentRegistry,
  Var extends v.Variable<EnvReg> = v.Variable<EnvReg>,
> {
  /**
   * Creates a new VariableRegistry instance.
   *
   * @param environmentRegistry - The environment registry this variable registry belongs to
   * @param variables - Array of variable definitions
   * @private
   */
  private constructor(
    private environmentRegistry: EnvReg,
    private variables: Var[],
  ) {}

  /**
   * Creates a new empty VariableRegistry for the specified environment registry.
   *
   * @template EnvReg - The environment registry type
   * @param environmentRegistry - The environment registry to create variables for
   * @returns A new VariableRegistry with no variables
   *
   * @example
   * ```typescript
   * const varReg = VariableRegistry.create(envReg)
   * ```
   */
  public static create<
    EnvReg extends er.EnvironmentRegistry,
  >(environmentRegistry: EnvReg) {
    return new VariableRegistry<EnvReg, never>(
      environmentRegistry,
      [],
    )
  }

  /**
   * Adds a new variable definition to the registry.
   *
   * This method ensures type safety by preventing duplicate variable names
   * and validating that the variable is defined for valid environments.
   *
   * @template Name - The name of the variable (must be uppercase)
   * @template DR - The defined resolution type for this variable
   * @param name - The unique name for this variable (must be uppercase)
   * @param f - Function that configures the variable with its environment definitions
   * @returns A new VariableRegistry with the added variable
   *
   * @example
   * ```typescript
   * const varReg = varReg
   *   .addVar("DATABASE_URL", (v) => v
   *     .for("local", "from-env")
   *     .for("workflows", "from-github-secrets"))
   *   .addVar("IS_WORKFLOW", (v) => v
   *     .for("local", "hardcoded", "false")
   *     .for("workflows", "hardcoded", "true"))
   *   .addVar("DOCUMENT_BUCKET", (v) => v
   *     .dynamicFor("local", "documentBucket"))
   * ```
   */
  public addVar<
    Name extends Uppercase<string>,
    DR extends res.DefinedResolution<EnvReg>,
  >(
    name: u.RemoveLiteral<Name, Var["name"]>,
    f: (b: v.Variable<EnvReg, Name, never>) => v.Variable<EnvReg, Name, DR>,
  ) {
    return new VariableRegistry<
      EnvReg,
      Var | v.Variable<EnvReg, Name, DR>
    >(this.environmentRegistry, [
      ...this.variables,
      f(v.Variable.create(name)),
    ])
  }

  /**
   * Merges this variable registry with another one.
   *
   * This method ensures type safety by preventing conflicts between
   * variable names from both registries.
   *
   * @template Name - The name of variables in the other registry
   * @template Var2 - The variable types from the other registry
   * @param otherEnvReg - The variable registry to merge with
   * @returns A new VariableRegistry with variables from both registries
   *
   * @example
   * ```typescript
   * const openAIVarReg = envReg.createVariableRegistry()
   *   .addVar("OPENAI_API_KEY", (v) => v
   *     .for("workflows", "from-aws-secrets")
   *     .for("local", "from-env"))
   *
   * const globalVarReg = envReg.createVariableRegistry()
   *   .mergeWith(openAIVarReg)
   *   .addVar("DATABASE_URL", (v) => v
   *     .for("workflows", "from-github-secrets")
   *     .for("local", "from-env"))
   * ```
   */
  public mergeWith<
    Name extends Uppercase<string>,
    Var2 extends v.Variable<EnvReg, Name>,
  >(
    otherEnvReg: u.KeepIf<
      VariableRegistry<EnvReg, Var2>,
      u.Not<u.HasIntersection<Var, Var2>>
    >,
  ) {
    return new VariableRegistry<EnvReg, Var | Var2>(this.environmentRegistry, [
      ...this.variables,
      ...otherEnvReg.variables,
    ])
  }

  /**
   * Creates a resolver for a specific environment.
   *
   * The resolver provides type-safe access to variable values for the
   * specified environment. It automatically handles dynamic data requirements
   * based on the variable definitions.
   *
   * @template EnvName - The environment name to create a resolver for
   * @template DynamicData - The dynamic data type (inferred automatically)
   * @param envName - The name of the environment to create a resolver for
   * @param envData - The environment data for the target environment
   * @param args - Dynamic data (optional, required only if variables use dynamic resolution)
   * @returns A Resolver instance for the specified environment
   * @internal
   *
   * @example
   * ```typescript
   * const resolver = varReg.createResolver(
   *   "local",
   *   { env: { DATABASE_URL: "test" } },
   *   { documentBucket: "my document bucket name" }
   * )
   *
   * // Get values
   * const isWorkflow = resolver.get("IS_WORKFLOW") // "false"
   * const dbUrl = resolver.get("DATABASE_URL") // "test"
   * const bucket = resolver.get("DOCUMENT_BUCKET") // "my document bucket name"
   * ```
   */
  public createResolver<
    EnvName extends t.GetEnvName<EnvReg>,
    DynamicData extends t.GetDynamicData<EnvReg, EnvName, Var>,
  >(
    envName: EnvName,
    envData: t.GetEnvData<EnvReg, EnvName>,
    ...args: u.OptionalIf<
      u.KeepIf<
        DynamicData,
        u.Extends<t.GetDynamicData<EnvReg, EnvName, Var>, DynamicData>
      >,
      u.Extends<undefined, DynamicData>
    >
  ) {
    const dynamicData = args[0] ?? {} as DynamicData
    return new r.Resolver<
      EnvReg,
      EnvName,
      Var
    >(
      this.environmentRegistry,
      this.variables,
      envName,
      envData,
      dynamicData,
      [envName],
    )
  }

  /**
   * Creates a resolver with dynamic environment selection at runtime.
   *
   * This method solves the TypeScript limitation where conditional resolver
   * creation breaks type inference. Instead of creating resolvers conditionally,
   * you provide all possible environment configurations upfront and select the
   * environment at runtime.
   *
   * The resolver only allows access to variables that are defined in ALL
   * possible environments to maintain type safety.
   *
   * @template Defs - The environment definitions object type
   * @param definitions - Object mapping environment names to their data configurations
   * @param fn - Function that returns the environment name to use at runtime
   * @returns A Resolver instance for the dynamically selected environment
   *
   * @example
   * ```typescript
   * // Instead of this (which breaks type inference):
   * // const resolver = condition ?
   * //   varReg.createResolver("env1", data1) :
   * //   varReg.createResolver("env2", data2)
   *
   * // Use this (maintains type safety):
   * const resolver = varReg.createDynamicResolver({
   *   env1: [{ env: { DATABASE_URL: "dev" } }],
   *   env2: [{ env: { DATABASE_URL: "prod" } }]
   * }, () => process.env.NODE_ENV === "production" ? "env2" : "env1")
   *
   * // Only variables defined in both environments are accessible
   * const dbUrl = resolver.get("DATABASE_URL") // Type-safe access
   *
   * // With dynamic data:
   * const resolver = varReg.createDynamicResolver({
   *   local: [{ env: {} }, { bucket: "dev-bucket" }],
   *   prod: [{ env: {} }, { bucket: "prod-bucket" }]
   * }, () => process.env.NODE_ENV === "production" ? "prod" : "local")
   * ```
   */
  public createDynamicResolver<
    Defs extends {
      [EnvName in t.GetEnvName<EnvReg>]?: [
        t.GetEnvData<EnvReg, EnvName>,
        ...args: u.OptionalIf<
          t.GetDynamicData<EnvReg, EnvName, Var>,
          u.Extends<undefined, t.GetDynamicData<EnvReg, EnvName, Var>>
        >,
      ]
    },
  >(
    definitions: Defs,
    fn: () => keyof Defs,
  ) {
    type EnvName = (keyof Defs) & t.GetEnvName<EnvReg>
    const envName = fn() as EnvName
    const definition = definitions[envName]!
    const envData = definition[0]
    const dynamicData = definition[1] ?? {} as t.GetDynamicData<EnvReg, EnvName, Var>
    return new r.Resolver<
      EnvReg,
      EnvName,
      Var
    >(
      this.environmentRegistry,
      this.variables,
      envName,
      envData,
      dynamicData,
      Object.keys(definitions) as t.GetEnvName<EnvReg>[],
    )
  }

  /**
   * Lists all variables that use a specific resolution tag in a given environment.
   *
   * This method filters variables based on their environment-specific resolution
   * definitions and returns the names of variables that use the specified tag
   * in their user-defined resolutions.
   *
   * @template EnvName - The environment name to filter variables for
   * @template Tag - The resolution tag to filter by
   * @param envName - The name of the environment to check
   * @param tag - The resolution tag to look for
   * @returns An array of variable names that use the specified tag in the given environment
   *
   * @example
   * ```typescript
   * // Get all variables that use "from-env" resolution in local environment
   * const envVars = varReg.listVariables("local", "from-env")
   * // ["DATABASE_URL", "API_KEY", ...]
   * ```
   */
  public listVariables<
    EnvName extends t.GetEnvName<EnvReg>,
    Tag extends t.GetTag<EnvReg, EnvName>,
  >(
    envName: EnvName,
    tag: Tag,
  ) {
    return this.variables
      .filter((v) => v.definitions.some((d) =>
        d.envName === envName &&
        d.type.type === "user-defined" &&
        d.type.tag === tag))
      .map((v) => v.name)
  }
}
