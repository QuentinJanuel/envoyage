import type * as er from "./environment-registry.js"
import type * as res from "./resolution.js"
import type * as v from "./variable.js"
import type * as a from "./async.js"
import type * as td from "./type-def.js"

/**
 * Extracts the name of an environment from an EnvironmentRegistry.
 *
 * @template EnvReg - The environment registry type
 * @returns The environment name as a string literal type
 *
 * @example
 * ```typescript
 * type EnvName = GetEnvName<typeof envReg> // "local" | "workflows"
 * ```
 */
export type GetEnvName<
  EnvReg extends er.EnvironmentRegistry,
> = EnvReg["environments"][number]["name"]

/**
 * Extracts a specific environment from an EnvironmentRegistry by name.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The specific environment name to extract
 * @returns The environment type with the specified name
 *
 * @example
 * ```typescript
 * type LocalEnv = GetEnv<typeof envReg, "local">
 * ```
 */
export type GetEnv<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
> = EnvReg["environments"][number] & { name: EnvName }

/**
 * Extracts all resolution tag names available for a specific environment.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @returns Union of all resolution tag names for the environment
 *
 * @example
 * ```typescript
 * type Tags = GetTag<typeof envReg, "local"> // "hardcoded" | "from-env"
 * ```
 */
export type GetTag<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
> = GetEnv<EnvReg, EnvName>["resolutions"][number]["tag"]

/**
 * Extracts the environment data type for a specific environment.
 * This represents the data structure that must be provided when creating a resolver.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @returns The environment data type structure
 *
 * @example
 * ```typescript
 * type EnvData = GetEnvData<typeof envReg, "local"> // { env: Record<string, string> }
 * ```
 */
export type GetEnvData<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
> = td.Infer<GetEnv<EnvReg, EnvName>["resolutions"][number]["envDataType"]>

/**
 * Extracts a specific resolution from an environment by its tag.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @template Tag - The resolution tag name
 * @returns The resolution type with the specified tag
 *
 * @example
 * ```typescript
 * type HardcodedRes = GetResolution<typeof envReg, "local", "hardcoded">
 * ```
 */
export type GetResolution<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Tag extends GetTag<EnvReg, EnvName>,
> = Extract<
  GetEnv<EnvReg, EnvName>["resolutions"][number],
  res.Resolution<Tag>
>

/**
 * Extracts the payload type for a specific resolution in an environment.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @template Tag - The resolution tag name (defaults to all tags)
 * @returns The payload type for the resolution
 *
 * @example
 * ```typescript
 * type Payload = GetPayload<typeof envReg, "local", "hardcoded"> // string
 * ```
 */
export type GetPayload<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Tag extends GetTag<EnvReg, EnvName> = GetTag<EnvReg, EnvName>,
> = td.Infer<GetResolution<EnvReg, EnvName, Tag>["payloadType"]>

/**
 * Extracts the async status (sync/async) from a resolve function.
 *
 * @template R - The resolve function type
 * @returns "sync" or "async" depending on the resolve function
 *
 * @example
 * ```typescript
 * type Status = GetResolveSyncStatus<typeof resolveFn> // "sync" | "async"
 * ```
 */
export type GetResolveSyncStatus<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  R extends res.Resolve<any, any, a.AsyncStatus>,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
> = R extends res.Resolve<any, any, infer Async> ? Async : never

/**
 * Extracts the variable name from a Variable type.
 *
 * @template V - The variable type
 * @returns The variable name as a string literal type
 *
 * @example
 * ```typescript
 * type VarName = GetName<Variable<...>> // "DATABASE_URL"
 * ```
 */
export type GetName<V> = V extends v.Variable<infer _S, infer N>
  ? N
  : never

/**
 * Filters variables to only include those that have definitions for a specific environment.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name to filter by
 * @template Var - The variable type
 * @returns Only variables that have definitions for the specified environment
 *
 * @example
 * ```typescript
 * type LocalVars = GetVariableForEnv<typeof envReg, "local", Variable<...>>
 * ```
 */
export type GetVariableForEnv<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg>,
> = Var extends v.Variable<EnvReg, infer N, infer DR>
  ? DR extends { envName: EnvName }
    ? v.Variable<EnvReg, N, DR>
    : never
  : never

/**
 * Gets all environments where a variable is defined.
 *
 * @template Var - The variable type
 * @returns Union of environment names where the variable is defined
 *
 * @example
 * ```typescript
 * type Envs = GetVariableEnvs<Variable<...>> // "local" | "production"
 * ```
 */
export type GetVariableEnvs<
  Var extends v.Variable<er.EnvironmentRegistry>,
> = Var extends { definitions: Array<infer DR> }
  ? DR extends { envName: infer E } ? E : never
  : never

/**
 * Filters `Var` to only include variables that have a definition for *every* environment in `EnvName`.
 *
 * • If `EnvName` is a single environment, it behaves like `GetVariableForEnv`.
 * • If `EnvName` is a union (e.g. "env1" | "env2"), it returns only the variables that are defined in **all** of
 *   those environments (i.e. the intersection / common variables).
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name or union of names to filter by
 * @template Var - The variable type to filter
 * @returns Only variables that have definitions for **every** specified environment
 *
 * @example
 * ```typescript
 * type CommonVars = GetCommonVariableForEnv<
 *   typeof envReg,
 *   "local" | "production",
 *   Variable<typeof envReg>[number]
 * >
 * // Result: variables defined in *both* "local" and "production"
 * ```
 */
export type GetCommonVariableForEnv<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg>,
> = Var extends v.Variable<EnvReg>
  ? [EnvName] extends [GetVariableEnvs<Var>]
    ? Var
    : never
  : never

/**
 * Extracts the resolution type for a variable in a specific environment.
 * This is the base type that determines how a variable is resolved (static, dynamic, or user-defined).
 * For user-defined resolutions, use {@link GetResolutionTag} to get the specific tag.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @template Var - The variable type
 * @returns The resolution type for the variable in the environment
 *
 * @example
 * ```typescript
 * type ResType = GetResolutionType<typeof envReg, "local", Variable<...>>
 * // { type: "user-defined", tag: "from-env" } | { type: "dynamic", dynamicName: "bucket" }
 * ```
 */
export type GetResolutionType<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg>,
> = GetDefinedResolution<EnvReg, EnvName, Var>["type"]

/**
 * Extracts the resolution tag for a specific variable in a specific environment.
 * This type only works for user-defined resolutions (where type is "user-defined").
 * For dynamic or static resolutions, this will return never.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @template Var - The variable type
 * @template Name - The variable name
 * @returns The resolution tag used for the variable in the environment
 *
 * @example
 * ```typescript
 * // For a user-defined resolution:
 * type Tag = GetResolutionTag<typeof envReg, "local", Variable<...>, "DATABASE_URL">
 * // "from-env"
 *
 * // For a dynamic resolution:
 * type Tag = GetResolutionTag<typeof envReg, "local", Variable<...>, "BUCKET_NAME">
 * // never
 * ```
 *
 * @see GetResolutionType - Get the base resolution type first to determine if it's user-defined
 */
export type GetResolutionTag<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg>,
  Name extends GetName<GetVariableForEnv<EnvReg, EnvName, Var>>,
> = Extract<
  Extract<
    Extract<
      GetVariableForEnv<EnvReg, EnvName, Var>,
      v.Variable<EnvReg, Name>
    >["definitions"][number]["type"],
    { type: "user-defined" }
  >,
  { type: "user-defined" }
>["tag"]

/**
 * Gets the resolve function for a variable in a specific environment.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @template Var - The variable type
 * @template Name - The variable name
 * @returns The resolve function type
 */
export type GetResolveFunction<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg>,
  Name extends GetName<GetVariableForEnv<EnvReg, EnvName, Var>>,
> = GetResolution<
  EnvReg,
  EnvName,
  GetResolutionTag<EnvReg, EnvName, Var, Name>
>["resolve"]

/**
 * Determines if a variable resolution is async or sync for a specific environment.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @template Var - The variable type
 * @template Name - The variable name
 * @returns "sync" or "async" depending on the resolution method
 *
 * @example
 * ```typescript
 * type Status = GetAsyncStatus<typeof envReg, "local", Variable<...>, "API_KEY">
 * // "async" if the resolution is async, "sync" otherwise
 * ```
 */
export type GetAsyncStatus<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg>,
  Name extends GetName<GetVariableForEnv<EnvReg, EnvName, Var>>,
> = MergeAsync<
  GetResolveSyncStatus<
    GetResolveFunction<EnvReg, EnvName, Var, Name>
  >
>

/**
 * Extracts the dynamic variable payload names for variables in a specific environment.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @template Var - The variable type
 * @returns The dynamic variable names that need to be provided
 *
 * @example
 * ```typescript
 * type DynamicNames = GetDynamicVariablePayload<typeof envReg, "local", Variable<...>>
 * // "documentBucket" | "otherDynamicVar"
 * ```
 */
export type GetDynamicVariablePayload<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg>,
> = Extract<
  GetVariableForEnv<EnvReg, EnvName, Var>["definitions"][number]["type"],
  { type: "dynamic" }
>["dynamicName"]

/**
 * Creates the dynamic data type structure that must be provided when creating a resolver.
 * If no dynamic variables exist for the environment, returns undefined.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name
 * @template Var - The variable type
 * @returns The dynamic data type or undefined if no dynamic variables exist
 *
 * @example
 * ```typescript
 * type DynamicData = GetDynamicData<typeof envReg, "local", Variable<...>>
 * // { documentBucket: string } | undefined
 * ```
 */
export type GetDynamicData<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg>,
> = GetDynamicVariablePayload<EnvReg, EnvName, Var> extends never ? undefined : {
  [key in GetDynamicVariablePayload<EnvReg, EnvName, Var>]: string
}

/**
 * Gets the variable definition for a specific environment.
 *
 * @template Var - The variable type
 * @returns The variable definition type
 */
export type GetVariableDefinition<
  Var extends v.Variable<er.EnvironmentRegistry>,
> = Var["definitions"][number]

/**
 * Extracts the defined resolution for a variable in a specific environment.
 *
 * @template EnvReg - The environment registry type
 * @template EnvName - The environment name (defaults to all environments)
 * @template Var - The variable type (defaults to any variable)
 * @returns The defined resolution type for the variable in the environment
 *
 * @example
 * ```typescript
 * type DefRes = GetDefinedResolution<typeof envReg, "local", Variable<...>>
 * ```
 */
export type GetDefinedResolution<
  EnvReg extends er.EnvironmentRegistry,
  EnvName extends GetEnvName<EnvReg> = GetEnvName<EnvReg>,
  Var extends v.Variable<EnvReg> = v.Variable<EnvReg>,
> = GetVariableDefinition<Var> & res.DefinedResolution<EnvReg, EnvName>

/**
 * Collapses a union of {@link AsyncStatus | AsyncStatus values} into a single status.
 *
 * • If **any** member of the union is "async", the resulting status is "async".
 * • Otherwise (every member is "sync"), the result is "sync".
 *
 * @template Status - A union of "sync" | "async" values to merge
 * @returns "async" if the input union includes "async", otherwise "sync".
 *
 * @example
 * ```typescript
 * type A = MergeAsync<"sync">            // "sync"
 * type B = MergeAsync<"async">           // "async"
 * type C = MergeAsync<"sync" | "async"> // "async"
 * ```
 */
export type MergeAsync<Status extends a.AsyncStatus> = "async" extends Status ? "async" : "sync"
