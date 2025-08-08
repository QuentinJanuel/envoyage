/**
 * Represents whether a resolution function is synchronous or asynchronous.
 *
 * @example
 * ```typescript
 * type Status = AsyncStatus // "sync" | "async"
 * ```
 */
export type AsyncStatus = "sync" | "async"

/**
 * Maps an async status to the appropriate return type.
 *
 * @template Async - The async status ("sync" or "async")
 * @template T - The base type to wrap
 * @returns T for "sync", Promise<T> for "async"
 *
 * @example
 * ```typescript
 * type SyncResult = AsyncValue<"sync", string> // string
 * type AsyncResult = AsyncValue<"async", string> // Promise<string>
 * ```
 */
export type AsyncValue<Async extends AsyncStatus, T> = Async extends "async"
  ? Promise<T>
  : T
