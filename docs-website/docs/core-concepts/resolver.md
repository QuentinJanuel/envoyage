# Resolver

Resolvers provide access to your variables in a specific environment. They handle the actual resolution of variables using the methods defined in your environment registry.

## Creating a Resolver

To create a resolver, you need:
1. The environment name
2. The environment data (matching the environment's data structure)

```typescript
const resolver = varReg.createResolver(
  "local",
  { env: process.env },
)
```

:::info
If your variable registry uses any dynamic variables, you'll also need to provide their values when creating the resolver. Learn more about [dynamic variables](../advanced-usage/dynamic-variable.md).
:::

## Using a Resolver

Once created, a resolver provides type-safe access to your variables:

```typescript
// Get a single variable
const dbUrl = resolver.get("DATABASE_URL")

// Get all variables
const allValues = resolver.getAll()
```

### Async Resolution

If your variable is using an asynchronous resolution for this environment, the resolver will return a promise:

```typescript
// If AWS_SECRET uses an async resolution, this returns a Promise
const secret = await resolver.get("AWS_SECRET")

// getAll returns a Promise if at least one variable is async
const allValues = await resolver.getAll()
```

:::info
The library intentionally avoids making all resolutions async by default. This allows the library to be used in contexts where awaiting is not possible, such as synchronous initialization code or environments that don't support async/await.
:::

:::info
Resolvers can also be created with dynamic environment selection, allowing runtime choice of environment. Learn more about [dynamic resolvers](../advanced-usage/dynamic-resolver.md).
:::