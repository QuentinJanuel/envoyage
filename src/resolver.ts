import type { AsyncValue } from "./async.js"
import type { EnvironmentRegistry } from "./environment-registry.js"
import { defineType } from "./type-def.js"
import type { GetEnvName, GetEnvData, GetDynamicData, GetName, GetAsyncStatus, GetCommonVariableForEnv, GetVariableForEnv } from "./types.js"
import type { Variable } from "./variable.js"

/**
 * Resolves variable values for a specific environment.
 *
 * The Resolver provides type-safe access to variable values based on the
 * environment configuration and variable definitions. It handles both
 * synchronous and asynchronous resolutions automatically.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The specific environment name
 * @template Var - The variable registry type
 *
 * @example
 * ```typescript
 * const resolver = varReg.createResolver("local", { env: { DATABASE_URL: "test" } })
 *
 * // Synchronous resolution
 * const isWorkflow = resolver.get("IS_WORKFLOW") // string
 *
 * // Asynchronous resolution
 * const apiKey = await resolver.get("OPENAI_API_KEY") // Promise<string>
 * ```
 */
export class Resolver<
  EnvReg extends EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends Variable<EnvReg> = Variable<EnvReg>,
> {
  /**
   * Type definition for the variable registry.
   * Required for proper TypeScript variance handling.
   * @private
   */
  private varType = defineType<Var>()

  /** Cache: variable name → true if any possible env resolves asynchronously */
  private variableAsyncMap: Record<string, boolean> = {}

  /**
   * Creates a new Resolver instance.
   *
   * @param environmentRegistry - The environment registry containing all environments
   * @param variables - Array of variable definitions
   * @param envName - The name of the environment to resolve for
   * @param envData - The environment data for the target environment
   * @param dynamicData - Dynamic data provided at runtime (optional)
   * @private
   */
  public constructor(
    private environmentRegistry: EnvReg,
    private variables: Variable<EnvironmentRegistry>[],
    private envName: EnvName,
    private envData: GetEnvData<EnvReg, EnvName>,
    private dynamicData: GetDynamicData<EnvReg, EnvName, Var>,
    private possibleEnvNames: GetEnvName<EnvReg>[],
  ) {}

  /**
   * Gets the value of a variable for the current environment.
   *
   * This method provides type-safe access to variable values. It automatically
   * handles both synchronous and asynchronous resolutions based on the variable
   * definition and environment configuration.
   *
   * @template Name - The name of the variable to resolve
   * @template Async - Whether the resolution is sync or async (inferred automatically)
   * @param name - The name of the variable to resolve
   * @returns The resolved value (string for sync, Promise<string> for async)
   *
   * @throws {Error} When the variable is not found
   * @throws {Error} When no definition exists for the variable in the current environment
   * @throws {Error} When no resolution method is found for the variable
   * @throws {Error} When the resolved value is not a string
   *
   * @example
   * ```typescript
   * const resolver = varReg.createResolver("local", { env: { DATABASE_URL: "test" } })
 *
   * // Get a hardcoded value
   * const isWorkflow = resolver.get("IS_WORKFLOW") // "false"
   *
   * // Get a value from environment data
   * const dbUrl = resolver.get("DATABASE_URL") // "test"
   *
   * // Get a dynamic value
   * const bucket = resolver.get("DOCUMENT_BUCKET") // "my document bucket name"
   *
   * // Get an async value (requires await)
   * const apiKey = await resolver.get("OPENAI_API_KEY") // "secret for OPENAI_API_KEY from aws"
   * ```
   */
  public get<
    Name extends GetName<GetCommonVariableForEnv<EnvReg, EnvName, Var>>,
    Async extends GetAsyncStatus<EnvReg, EnvName, Var, Name & GetName<GetVariableForEnv<EnvReg, EnvName, Var>>>,
  >(
    name: Name,
  ): AsyncValue<Async, string> {
    const variable = this.variables.find((v) => v.name === name)
    if (variable === undefined)
      throw new Error(`Variable ${name} not found`)

    const isPossiblyAsync = this.getVariableAsyncStatus(name as string, variable)
    const def = variable.definitions.find((def) => def.envName === this.envName)
    if (def === undefined)
      throw new Error(`No definition found for variable ${name} in ${this.envName}`)
    const getValue = () => {
      if (def.type.type === "dynamic")
        return (this.dynamicData as Record<string, string>)?.[def.type.dynamicName]
      // user-defined
      const tag = def.type.tag
      const res = this.environmentRegistry
        .environments.find((env) => env.name === this.envName)
        ?.resolutions?.find((res) => res.tag === tag)
      if (res === undefined)
        throw new Error(`No resolution found for variable ${name} in ${this.envName} using ${def.type.tag}`)
      return res.resolve({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        payload: def.type.payload,
        envData: this.envData,
        variableName: name,
      })
    }
    const value = getValue()
    const validateValue = (v: string | undefined) => {
      if (v === undefined || v === null)
        throw new Error(`Variable ${name} in ${this.envName} resolved to undefined or null`)
      if (typeof v !== "string")
        throw new Error(`Variable ${name} in ${this.envName} resolved to a non-string value`)
      return v
    }
    if (value instanceof Promise)
      return value.then(validateValue) as AsyncValue<Async, string>

    const finalVal = validateValue(value)
    if (isPossiblyAsync)
      return Promise.resolve(finalVal) as AsyncValue<Async, string>

    return finalVal as AsyncValue<Async, string>
  }

  /**
   * Populate `variableAsyncMap` for the given variable name if not already cached.
   */
  private getVariableAsyncStatus(name: string, variable: Variable<EnvironmentRegistry>): boolean {
    const cached = this.variableAsyncMap[name]
    if (cached !== undefined)
      return cached
    let asyncFlag = false
    for (const env of this.possibleEnvNames) {
      const def = variable.definitions.find((d) => d.envName === env)
      if (!def) continue
      if (def.type.type === "user-defined") {
        const tag = def.type.tag
        const envObj = this.environmentRegistry.environments.find((e) => e.name === env)
        const res = envObj?.resolutions.find((r) => r.tag === tag)
        if (res && res.resolve.constructor.name === "AsyncFunction") {
          asyncFlag = true
          break
        }
      }
    }
    this.variableAsyncMap[name] = asyncFlag
    return asyncFlag
  }
}
