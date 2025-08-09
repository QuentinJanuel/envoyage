# envoyage

<!-- [![npm version](https://badge.fury.io/js/envoyage.svg)](https://badge.fury.io/js/envoyage)
[![Test](https://github.com/QuentinJanuel/envoyage/actions/workflows/test.yml/badge.svg)](https://github.com/QuentinJanuel/envoyage/actions/workflows/test.yml)
[![Release](https://github.com/QuentinJanuel/envoyage/actions/workflows/release.yml/badge.svg)](https://github.com/QuentinJanuel/envoyage/actions/workflows/release.yml) -->
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![semantic-release: conventionalcommits](https://img.shields.io/badge/semantic--release-conventionalcommits-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)

A type-safe environment variable management library for TypeScript applications. envoyage allows you to define environment configurations with multiple resolution strategies while maintaining full type safety across different deployment environments.

**envoyage is completely agnostic about how your variables are loaded**, it solely provides a safe way to declare your environment structure based on your specific requirements.

## Features

- **Type-Safe Environment Management**: Define environments with their data structures and resolution methods with full TypeScript support
- **Multiple Resolution Strategies**: Support for hardcoded values, environment variables, secrets, and custom resolution methods
- **Async/Sync Resolution**: Handle both synchronous and asynchronous variable resolution (e.g., fetching from external APIs)
- **Dynamic Variables**: Support for runtime-provided values through dynamic resolution
- **Environment Registry**: Centralized management of multiple environments (local, staging, production, etc.)
- **Variable Registry**: Define variables once and configure how they resolve across different environments
- **Merge Support**: Combine multiple variable registries for modular configuration

## Installation

```bash
npm install envoyage
```

## Quick Start

```typescript
import { createEnvironmentRegistry, defineType } from 'envoyage'

// Define your environments
const envReg = createEnvironmentRegistry()
  .addEnv(
    "local",
    defineType<{ env: Record<string, string> }>(),
    (env) => env
      .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
      .addResolution("from-env", defineType<string | undefined>(), (data) =>
        data.envData.env[data.payload ?? data.variableName])
  )
  .addEnv(
    "production",
    defineType<{ secrets: Record<string, string> }>(),
    (env) => env
      .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
      .addResolution("from-secrets", defineType<string | undefined>(), (data) =>
        data.envData.secrets[data.payload ?? data.variableName])
  )

// Define your variables
const varReg = envReg.createVariableRegistry()
  .addVar("DATABASE_URL", (v) => v
    .for("local", "from-env")
    .for("production", "from-secrets"))
  .addVar("IS_PRODUCTION", (v) => v
    .for("local", "hardcoded", "false")
    .for("production", "hardcoded", "true"))

// Create a resolver for a specific environment
const localResolver = varReg.createResolver(
  "local",
  { env: { DATABASE_URL: "localhost:5432/myapp" } }
)

console.log(localResolver.get("DATABASE_URL")) // "localhost:5432/myapp"
console.log(localResolver.get("IS_PRODUCTION")) // "false"
```

## Core Concepts

### Environment Registry

An `EnvironmentRegistry` manages multiple environments, each with their own data structure and resolution methods:

```typescript
const envReg = createEnvironmentRegistry()
  .addEnv("local", defineType<LocalEnvData>(), configureLocalEnv)
  .addEnv("production", defineType<ProdEnvData>(), configureProdEnv)
```

### Environments

Each environment defines:
- **Name**: A unique identifier (e.g., "local", "production")
- **Data Type**: The structure of environment-specific data
- **Resolutions**: Methods for resolving variable values

```typescript
.addEnv(
  "workflows",
  defineType<{ githubSecrets: Record<string, string> }>(),
  (env) => env
    .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
    .addResolution("from-github-secrets", defineType<string | undefined>(), (data) =>
      data.envData.githubSecrets[data.payload ?? data.variableName])
    .addResolution("from-aws-secrets", defineType<undefined>(), async (data) => {
      // Async resolution example
      const secret = await fetchFromAWS(data.variableName)
      return secret
    })
)
```

### Variable Registry

A `VariableRegistry` defines environment variables and how they should be resolved in each environment:

```typescript
const varReg = envReg.createVariableRegistry()
  .addVar("API_KEY", (v) => v
    .for("local", "from-env")
    .for("production", "from-aws-secrets"))
  .addVar("APP_NAME", (v) => v
    .for("local", "hardcoded", "MyApp-Dev")
    .for("production", "hardcoded", "MyApp"))
```

### Dynamic Variables

For runtime-provided values:

```typescript
const varReg = envReg.createVariableRegistry()
  .addVar("DOCUMENT_BUCKET", (v) => v
    .dynamicFor("local", "bucketName")
    .for("production", "from-secrets"))

// Provide dynamic data when creating the resolver
const resolver = varReg.createResolver(
  "local",
  envData,
  { bucketName: "my-local-bucket" }
)
```

### Resolvers

Create environment-specific resolvers to access variable values:

```typescript
const resolver = varReg.createResolver("production", {
  secrets: { API_KEY: "secret-value" }
})

const apiKey = resolver.get("API_KEY") // Type-safe access
```

## Additional Features

### Async Resolution

envoyage automatically handles async resolutions:

```typescript
// If the resolution is async, the return type becomes Promise<string>
const apiKey = await resolver.get("API_KEY")
```

### Merging Variable Registries

Combine multiple variable registries for modular configuration:

```typescript
const authVarReg = envReg.createVariableRegistry()
  .addVar("AUTH_SECRET", (v) => v.for("local", "from-env"))

const dbVarReg = envReg.createVariableRegistry()
  .addVar("DATABASE_URL", (v) => v.for("local", "from-env"))

const globalVarReg = envReg.createVariableRegistry()
  .mergeWith(authVarReg)
  .mergeWith(dbVarReg)
  .addVar("APP_VERSION", (v) => v.for("local", "hardcoded", "1.0.0"))
```

### Dynamic Environment Selection

For runtime environment selection while maintaining type safety:

```typescript
const resolver = varReg.createDynamicResolver({
  local: [{ env: process.env }],
  production: [{ secrets: await getSecrets() }]
}, () => process.env.NODE_ENV === "production" ? "production" : "local")

// Only variables defined in ALL environments are accessible
const value = resolver.get("SHARED_VARIABLE")
```

## Type Safety

envoyage provides complete type safety across all aspects of environment configuration - from environment names and resolution methods to variable definitions and return types. The TypeScript compiler ensures your environment configuration is valid at compile time.

## License

This project is licensed under the MIT License.

