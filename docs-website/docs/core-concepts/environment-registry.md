# Environment Registry

The Environment Registry is the foundation of envoyage. It defines your environments and their resolution methods. Each environment can have its own data structure and ways to resolve variables. A project should have only one Environment Registry that serves as the single source of truth for all environment configurations.

## Creating an Environment Registry

Start by creating a new environment registry:

```typescript
import { createEnvironmentRegistry, defineType } from "envoyage"

const envReg = createEnvironmentRegistry()
```

## Adding Environments

Each environment is added using the `addEnv` method, which takes:
1. A unique name for the environment
2. A type definition for the environment's data structure
3. A function that configures the environment's resolution methods

```typescript
const envReg = createEnvironmentRegistry()
  // Local environment with access to process.env
  .addEnv(
    "local",
    defineType<{
      env: Record<string, string>
    }>(),
    (env) => env
      .addResolution(...)  // Add resolution methods
  )
  // Production environment with access to secrets
  .addEnv(
    "production",
    defineType<{
      secrets: Record<string, string>
      features: Record<string, boolean>
    }>(),
    (env) => env
      .addResolution(...)  // Add resolution methods
  )
```

:::info
For a detailed explanation of `defineType` and the logic behind it, read [this page](./define-type.md).
:::

## Environment Structure

The environment structure defines how each environment is configured in the registry. This includes the environment's name, data structure, and resolution methods that determine how variables are resolved.

For example, a "local" environment might use process.env for resolution, while a "production" environment could use a secrets manager and feature flags system.

### Environment Data Structure

The environment data structure defines what data is available to resolution methods:

```typescript
// Simple environment with just process.env
defineType<{
  env: Record<string, string>
}>()

// Complex environment with multiple data sources
defineType<{
  secrets: Record<string, string>
  features: Record<string, boolean>
  redis: {
    client: RedisClient
    prefix: string
  }
}>()
```

This data will be provided when [creating a resolver](./resolver.md).

## Resolution Methods

Resolution methods define how variables are resolved in each environment. Each method:
1. Has a unique name within the environment
2. Defines what payload type it accepts (if any, this will be provided when [defining variables with this resolution](./variable-registry.md))
3. Provides a function to resolve the value

The resolution function can be:
- Synchronous: returns a `string` directly
- Asynchronous: returns a `Promise<string>`

The library handles both cases automatically, and the resolver's typing will adapt to match your resolution methods (e.g., if any resolution is async, the resolver's `get` method will return a Promise).

Here's a complete example of an environment with multiple resolution methods:

```typescript
const envReg = createEnvironmentRegistry()
  .addEnv(
    "local",
    defineType<{
      env: Record<string, string>
      redis: RedisClient
    }>(),
    (env) => env
      // Hardcoded values (payload is the value itself)
      .addResolution(
        "hardcoded",
        defineType<string>(),
        (data) => data.payload
      )
      
      // Read from process.env (no payload needed)
      .addResolution(
        "from-env",
        defineType<undefined>(),
        (data) => data.envData.env[data.variableName]
      )
      
      // Read from process.env with custom key (payload is the env var name)
      .addResolution(
        "from-env-key",
        defineType<string>(),
        (data) => data.envData.env[data.payload]
      )
      
      // Async resolution from Redis
      .addResolution(
        "from-redis",
        defineType<string>(),
        async (data) => {
          const key = `${data.payload}:${data.variableName}`
          return data.envData.redis.client.get(key)
        }
      )
  )
```

### Resolution Method Parameters

Each resolution method has access to:

- `data.variableName`: The name of the variable being resolved
- `data.payload`: The payload provided in the variable definition (type matches the `defineType` parameter)
- `data.envData`: The environment data structure (type matches the environment's `defineType` parameter)

### Common Resolution Patterns

1. **Hardcoded Values**
   ```typescript
   .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
   ```
   Use for constants or environment-specific defaults.

2. **Environment Variables**
   ```typescript
   .addResolution("from-env", defineType<string | undefined>(), (data) =>
     data.envData.env[data.payload ?? data.variableName])
   ```
   Read from process.env or similar. The payload can be used to specify a custom environment variable name - if provided, it will read from that name instead of the variable name. For example, if resolving a variable named "API_KEY" but the env var is "LEGACY_API_KEY", you can pass "LEGACY_API_KEY" as the payload.

3. **Async Resolution**
   ```typescript
   .addResolution("from-aws", defineType<undefined>(), async (data) => {
     const secret = await fetchFromAWS(data.variableName)
     return secret
   })
   ```
   Fetch values asynchronously (e.g., from external services).
