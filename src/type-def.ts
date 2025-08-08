/**
 * A type definition wrapper that preserves type information.
 * Used to define and infer types in the type system.
 *
 * @template T - The type to wrap (defaults to any)
 *
 * @example
 * ```typescript
 * const stringType = defineType<string>()
 * const numberType = defineType<number>()
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface TypeDef<T = any> { __phantom?: T }

/**
 * Extracts the inferred type from a TypeDef wrapper.
 *
 * @template T - The TypeDef to extract from
 * @returns The original type that was wrapped
 *
 * @example
 * ```typescript
 * type Extracted = Infer<TypeDef<string>> // string
 * type NumberType = Infer<TypeDef<number>> // number
 * ```
 */
export type Infer<T extends TypeDef> = T extends TypeDef<infer U> ? U : never

/**
 * Creates a TypeDef wrapper for a given type.
 *
 * @template T - The type to wrap (defaults to never)
 * @returns A TypeDef instance wrapping the specified type
 *
 * @example
 * ```typescript
 * const stringType = defineType<string>()
 * const envDataType = defineType<{ env: Record<string, string> }>()
 * ```
 */
export const defineType = <T = never>(): TypeDef<T> => ({})
