import type * as a from "./async.js"
import * as res from "./resolution.js"
import * as td from "./type-def.js"
import type * as u from "./utils.js"

/**
 * Represents an environment with its name, data structure, and resolution methods.
 *
 * Each environment can have multiple resolution methods (hardcoded, from-env, etc.)
 * and maintains type safety for the environment data and resolution payloads.
 *
 * @template Name - The name of the environment
 * @template Data - The data structure for this environment
 * @template R - The union of all resolution types for this environment
 */
export class Environment<
  Name extends string = string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Data = any,
  R extends res.Resolution<string, Data> = res.Resolution<string, Data>,
> {
  /**
   * Type definition for the environment data structure.
   */
  public dataType = td.defineType<Data>()

  /**
   * Creates a new Environment instance.
   *
   * @param name - The name of the environment
   * @param resolutions - Array of resolution methods for this environment
   * @private
   */
  private constructor(
    public name: Name,
    public resolutions: R[],
  ) {}

  /**
   * Creates a new Environment with the specified name and data type.
   *
   * @template Name - The name of the environment
   * @template Data - The data structure for this environment
   * @param name - The name of the environment
   * @returns A new Environment with no resolutions
   * @internal
   */
  public static create<Name extends string, Data>(name: Name) {
    return new Environment<Name, Data, never>(name, [])
  }

  /**
   * Adds a synchronous resolution method to the environment.
   *
   * @template Tag - The unique tag for this resolution method
   * @template Payload - The payload type for this resolution
   * @param tag - The unique tag for this resolution method
   * @param _payloadType - Type definition for the payload (used for type inference)
   * @param resolve - The synchronous resolve function
   * @returns A new Environment with the added resolution
   *
   * @example
   * ```typescript
   * (env) => env
   *   .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
   *   .addResolution("from-env", defineType<undefined>(), (data) =>
   *     data.envData.env[data.payload ?? data.variableName])
   * ```
   */
  public addResolution<
    Tag extends string,
    Payload,
  >(
    tag: u.RemoveLiteral<Tag, R["tag"]>,
    _payloadType: td.TypeDef<Payload>,
    resolve: res.Resolve<Data, Payload, "sync">,
  ): Environment<
    Name,
    Data,
    R | res.Resolution<Tag, Data, Payload, "sync">
  >
  /**
   * Adds an asynchronous resolution method to the environment.
   *
   * @template Tag - The unique tag for this resolution method
   * @template Payload - The payload type for this resolution
   * @param tag - The unique tag for this resolution method
   * @param _payloadType - Type definition for the payload (used for type inference)
   * @param resolve - The asynchronous resolve function
   * @returns A new Environment with the added resolution
   *
   * @example
   * ```typescript
   * (env) => env
   *   .addResolution("from-aws-secrets", defineType<undefined>(), async (data) => {
   *     await new Promise(resolve => setTimeout(resolve, 1000))
   *     return `secret for ${data.variableName} from aws`
   *   })
   * ```
   */
  public addResolution<
    Tag extends string,
    Payload,
  >(
    tag: Tag,
    _payloadType: td.TypeDef<Payload>,
    resolve: res.Resolve<Data, Payload, "async">,
  ): Environment<
    Name,
    Data,
    R | res.Resolution<Tag, Data, Payload, "async">
  >
  public addResolution<
    Tag extends string,
    Payload,
  >(
    tag: Tag,
    _payloadType: td.TypeDef<Payload>,
    resolve: res.Resolve<Data, Payload, a.AsyncStatus>,
  ) {
    return new Environment<
      Name,
      Data,
      R | res.Resolution<Tag, Data, Payload, a.AsyncStatus>
    >(
      this.name,
      [
        ...this.resolutions,
        res.Resolution.create<Tag, Data, Payload>(tag, resolve),
      ],
    )
  }
}
