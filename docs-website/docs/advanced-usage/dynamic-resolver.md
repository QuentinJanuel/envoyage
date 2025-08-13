# Dynamic Resolvers

## Motivation

Consider a scenario where your application needs to run in different environments based on runtime conditions. For example, a Node.js application that needs different configurations for development and production:

```typescript
// We need to create a resolver for the right environment
const resolver = process.env.NODE_ENV === "production"
  // Running in production
  ? varReg.createResolver(
      "prod",
      { /* ... */ },
    )
  // Running in development
  : varReg.createResolver(
     "dev",
     { /* ... */ },
   )
```

While this would work at runtime, TypeScript will fail to unify the two resolvers. When you try to use the unified resolver to get a variable, TypeScript will error with:

```typescript
// TypeScript Error: This expression is not callable.
resolver.get("VAR")
```

This happens because TypeScript sees the resolver as a union type of two different resolvers, and it cannot guarantee that both resolvers have the same variables available.

## Using `createDynamicResolver`

The `createDynamicResolver` method solves this TypeScript limitation by allowing you to define all possible environments upfront:

```typescript
const resolver = varReg.createDynamicResolver(
  {
    // Data for each possible environment
    prod: [{ env: process.env }],
    dev: [{ env: process.env }],
  },
  // Function that decides which environment to use
  () => process.env.NODE_ENV === "production" ? "prod" : "dev"
)

// Now TypeScript knows this is safe if the variable exists in both environments
const apiKey = resolver.get("API_KEY")
```

## API Comparison

The regular `createResolver` takes up to three arguments:
```typescript
createResolver(
  envName,      // Name of the environment
  envData,      // Environment data
  dynamicVars?, // Optional dynamic variables
)
```

The `createDynamicResolver` instead takes an object mapping environment names to arrays of data:
```typescript
createDynamicResolver(
  {
    // If no dynamic variables are used in the registry:
    envName1: [envData],
    // If dynamic variables are used (TypeScript enforces this):
    envName2: [envData, dynamicVars],
  },
  () => "envName1" // Function to select environment at runtime
)
```

TypeScript enforces that if you use `.dynamicFor()` in your variable registry, you must provide dynamic variables as the second array element.

## Type Safety

The dynamic resolver ensures that you can only access variables that are defined in all possible environments. This is enforced at compile time:

```typescript
const varReg = envReg.createVariableRegistry()
  // Available in both environments
  .addVar("API_KEY", (v) => v
    .for("prod", "from-env")
    .for("dev", "from-env"))
  // Only available in production
  .addVar("REDIS_CLUSTER_URL", (v) => v
    .dynamicFor("prod", "from-env"))

const resolver = varReg.createDynamicResolver(
  {
    prod: [{ /* ... */ }],
    dev: [{ /* ... */ }],
  },
  () => process.env.NODE_ENV === "production" ? "prod" : "dev"
)

// OK - API_KEY exists in both environments
resolver.get("API_KEY")

// TypeScript Error - REDIS_CLUSTER_URL only exists in production
resolver.get("REDIS_CLUSTER_URL")
```

## Using `getAll`

The `getAll()` method returns only the variables that are defined in all possible environments:

```typescript
const varReg = envReg.createVariableRegistry()
  .addVar("COMMON", (v) => v
    .for("prod", "from-env")
    .for("dev", "from-env"))
  .addVar("PROD_ONLY", (v) => v
    .for("prod", "from-env"))
  .addVar("DEV_ONLY", (v) => v
    .for("dev", "from-env"))

const resolver = varReg.createDynamicResolver(
  {
    prod: [{ env: process.env }],
    dev: [{ env: process.env }],
  },
  () => process.env.NODE_ENV === "production" ? "prod" : "dev"
)

const allVars = resolver.getAll()
// TypeScript infers: { COMMON: string }
// At runtime: { COMMON: "value" }
// Note: PROD_ONLY and DEV_ONLY are omitted both by TypeScript and at runtime
```

This ensures that your code can only depend on variables that are guaranteed to be available, regardless of which environment is selected at runtime.

## Async Resolution

If a variable uses an async resolution in any possible environment, the methods to access it become async.
