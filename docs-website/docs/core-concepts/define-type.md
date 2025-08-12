# Type Inference with defineType

The `defineType` helper is a crucial part of envoyage's type system. It allows you to explicitly define types for some generic parameters while letting TypeScript infer others.

## The Problem

TypeScript has an "all-or-nothing" approach to generic type inference - if you specify one type parameter explicitly, you must specify all of them.

Without `defineType`, you would need to write:

```typescript
// Without defineType - must specify ALL type parameters
.addEnv<"local", { env: Record<string, string> }, /* ... */>(
  "local",
  (env) => /* ... */
)
```

## The Solution

With `defineType`, you can specify just the types you want while letting TypeScript infer the rest:

```typescript
.addEnv(
  "local",
  defineType<{ env: Record<string, string> }>(),
  (env) => /* ... */
)
```

In this example, `defineType` allows us to:
1. Explicitly define the environment data structure type: `{ env: Record<string, string> }`
2. Let TypeScript infer the environment name type from the string literal `"local"`
3. Let TypeScript infer the resolution types from the resolution method definitions

The `defineType` pattern is used throughout envoyage to provide the perfect balance between explicit type definitions where needed and type inference where possible.