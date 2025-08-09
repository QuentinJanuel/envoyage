import type { AsyncStatus, AsyncValue } from "./async.js"
import type { EnvironmentRegistry } from "./environment-registry.js"
import type { GetEnvName, GetTag, GetPayload } from "./types.js"
import { defineType } from "./type-def.js"

/**
 * Data structure passed to resolve functions.
 *
 * @template EnvData - The environment data structure
 * @template Payload - The payload type for this resolution
 *
 * @example
 * ```typescript
 * const resolveFunction = (data: ResolveData<{ env: Record<string, string> }, string>) => {
 *   // data.envData.env contains environment variables
 *   // data.payload contains the hardcoded value
 *   // data.variableName contains the variable name being resolved
 *   return data.payload
 * }
 * ```
 */
export interface ResolveData<
  EnvData,
  Payload,
> {
  /**
   * The environment data for the current environment.
   * Contains the data structure defined when creating the environment.
   */
  envData: EnvData
  /**
   * The payload for this resolution method.
   * For hardcoded resolutions, this contains the hardcoded value.
   * For other methods, this may be undefined or contain additional data.
   */
  payload: Payload
  /**
   * The name of the variable being resolved.
   * This is the variable name (e.g., "DATABASE_URL").
   */
  variableName: Uppercase<string>
}

/**
 * Function signature for resolving variable values.
 *
 * @template EnvData - The environment data structure
 * @template Payload - The payload type for this resolution
 * @template Async - Whether the resolution is sync or async
 * @param data - Object containing environment data, payload, and variable name
 * @returns The resolved value (string for sync, Promise<string> for async)
 *
 * @example
 * ```typescript
 * // Synchronous resolution
 * const hardcodedResolve: Resolve<{ env: Record<string, string> }, string, "sync"> =
 *   (data) => data.payload
 *
 * // Asynchronous resolution
 * const asyncResolve: Resolve<{ env: Record<string, string> }, undefined, "async"> =
 *   async (data) => {
 *     await new Promise(resolve => setTimeout(resolve, 1000))
 *     return `secret for ${data.variableName} from aws`
 *   }
 * ```
 */
export type Resolve<
  EnvData,
  Payload,
  Async extends AsyncStatus,
> = (data: ResolveData<EnvData, Payload>) => AsyncValue<Async, string>

/**
 * Represents a resolution method for an environment.
 *
 * Each resolution has a unique tag, environment data type, payload type,
 * and a resolve function that handles the actual value resolution.
 *
 * @template Tag - The unique tag for this resolution method
 * @template EnvData - The environment data structure
 * @template Payload - The payload type for this resolution
 * @template Async - Whether the resolution is sync or async
 *
 * @example
 * ```typescript
 * const hardcodedResolution = Resolution.create(
 *   "hardcoded",
 *   (data) => data.payload
 * )
 * ```
 */
export class Resolution<
  Tag extends string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EnvData = any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Payload = any,
  Async extends AsyncStatus = AsyncStatus,
> {
  /**
   * Type definition for the environment data structure.
   */
  public envDataType = defineType<EnvData>()

  /**
   * Type definition for the payload structure.
   */
  public payloadType = defineType<Payload>()

  /**
   * Creates a new Resolution instance.
   *
   * @param tag - The unique tag for this resolution method
   * @param resolve - The resolve function for this resolution
   * @private
   */
  private constructor(
    public tag: Tag,
    public resolve: Resolve<EnvData, Payload, Async>,
  ) {}

  /**
   * Creates a new Resolution with the specified tag and resolve function.
   *
   * @template Tag - The unique tag for this resolution method
   * @template EnvData - The environment data structure
   * @template Payload - The payload type for this resolution
   * @template Async - Whether the resolution is sync or async (defaults to AsyncStatus)
   * @param tag - The unique tag for this resolution method
   * @param resolve - The resolve function for this resolution
   * @returns A new Resolution instance
   * @internal
   *
   * @example
   * ```typescript
   * const hardcodedRes = Resolution.create(
   *   "hardcoded",
   *   (data) => data.payload
   * )
   *
   * const asyncRes = Resolution.create(
   *   "from-aws-secrets",
   *   async (data) => {
   *     await new Promise(resolve => setTimeout(resolve, 1000))
   *     return `secret for ${data.variableName} from aws`
   *   }
   * )
   * ```
   */
  public static create = <
    Tag extends string,
    EnvData,
    Payload,
    Async extends AsyncStatus = AsyncStatus,
  >(
    tag: Tag,
    resolve: Resolve<EnvData, Payload, Async>,
  ) => new Resolution<Tag, EnvData, Payload, Async>(
    tag,
    resolve,
  )
}

/**
 * Union type for defined resolution types.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @returns Union of dynamic and user-defined resolution types
 *
 * @internal
 */
type DefinedResolutionType<
  EnvReg extends EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg> = GetEnvName<EnvReg>,
> =
  | {
    type: "dynamic"
    dynamicName: string
  }
  | {
    type: "user-defined"
    tag: GetTag<EnvReg, EnvName>
    payload: GetPayload<EnvReg, EnvName>
  }

/**
 * Represents a defined resolution for a variable in a specific environment.
 *
 * This type combines the environment name with the resolution type,
 * which can be either dynamic (provided at runtime) or user-defined
 * (defined in the environment configuration).
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name (defaults to all environments)
 * @template Type - The resolution type (defaults to all resolution types)
 * @returns The defined resolution structure
 *
 * @example
 * ```typescript
 * // User-defined resolution
 * type UserDefinedRes: DefinedResolution<typeof envReg, "local"> = {
 *   envName: "local"
 *   type: {
 *     type: "user-defined"
 *     tag: "hardcoded"
 *     payload: string
 *   }
 * }
 *
 * // Dynamic resolution
 * type DynamicRes: DefinedResolution<typeof envReg, "local"> = {
 *   envName: "local"
 *   type: {
 *     type: "dynamic"
 *     dynamicName: "documentBucket"
 *   }
 * }
 * ```
 */
export type DefinedResolution<
  EnvReg extends EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg> = GetEnvName<EnvReg>,
  Type extends DefinedResolutionType<EnvReg, EnvName> = DefinedResolutionType<EnvReg, EnvName>,
> = {
  envName: EnvName
  type: Type
}
