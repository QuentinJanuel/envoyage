/**
 * Conditionally includes a type based on a boolean condition.
 *
 * @template T - The type to conditionally include
 * @template B - The boolean condition
 * @returns T if B is true, never if B is false
 *
 * @example
 * ```typescript
 * type Included = KeepIf<"value", true> // "value"
 * type Excluded = KeepIf<"value", false> // never
 * ```
 */
export type KeepIf<T, B extends boolean> =
  B extends true ? T : never

/**
 * Checks if one type extends another type.
 *
 * @template T - The type to check
 * @template U - The type to check against
 * @returns true if T extends U, false otherwise
 *
 * @example
 * ```typescript
 * type ExtendsString = Extends<"hello", string> // true
 * type ExtendsNumber = Extends<"hello", number> // false
 * ```
 */
export type Extends<T, U> =
  T extends U ? true : false

/**
 * Makes a type optional in a tuple based on a boolean condition.
 *
 * @template T - The type to make optional
 * @template B - The boolean condition
 * @returns [T?] if B is true, [T] if B is false
 *
 * @example
 * ```typescript
 * type Optional = OptionalIf<string, true> // [string?]
 * type Required = OptionalIf<string, false> // [string]
 * ```
 */
export type OptionalIf<T, B extends boolean> = B extends true ? [T?] : [T]

/**
 * Negates a boolean type.
 *
 * @template T - The boolean type to negate
 * @returns false if T is true, true if T is false
 *
 * @example
 * ```typescript
 * type Negated = Not<true> // false
 * type AlsoNegated = Not<false> // true
 * ```
 */
export type Not<T extends boolean> = T extends true ? false : true

/**
 * Removes specific literal types from a union type.
 *
 * @template T - The union type to filter
 * @template L - The literal type(s) to remove
 * @returns T without the specified literal types
 *
 * @example
 * ```typescript
 * type Filtered = RemoveLiteral<"a" | "b" | "c", "a"> // "b" | "c"
 * type Multiple = RemoveLiteral<"a" | "b" | "c", "a" | "b"> // "c"
 * ```
 */
export type RemoveLiteral<T, L> = T extends L ? never : T

/**
 * Helper type for HasIntersection that checks intersection between two types.
 *
 * @template T - The first type
 * @template U - The second type
 * @returns null if T and U have an intersection, never otherwise
 *
 * @internal
 */
type HasIntersectionHelper<T, U> = T extends U
  ? null
  : U extends T
    ? null
    : never

/**
 * Checks if two types have any intersection.
 *
 * @template T - The first type
 * @template U - The second type
 * @returns true if T and U have an intersection, false otherwise
 *
 * @example
 * ```typescript
 * type HasOverlap = HasIntersection<"a" | "b", "b" | "c"> // true
 * type NoOverlap = HasIntersection<"a" | "b", "c" | "d"> // false
 * type StringOverlap = HasIntersection<string, "a"> // true
 * ```
 */
export type HasIntersection<T, U> = HasIntersectionHelper<T, U> extends never
  ? false
  : true
