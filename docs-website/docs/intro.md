# Introduction

envoyage is a zero-dependency, type-safe environment variable management library for TypeScript applications. It allows you to define environment configurations with multiple resolution strategies while maintaining full type safety across different deployment environments.

**envoyage is completely agnostic about how your variables are loaded**, it solely provides a safe way to declare your environment structure based on your specific requirements.

## Features

- **Type-Safe Environment Management**: Define environments with their data structures and resolution methods with full TypeScript support
- **Multiple Resolution Strategies**: Support for hardcoded values, environment variables, secrets, and custom resolution methods
- **Async/Sync Resolution**: Handle both synchronous and asynchronous variable resolution (e.g., fetching from external APIs)
- **Dynamic Variables**: Support for runtime-provided values through dynamic resolution
- **Environment Registry**: Centralized management of multiple environments (local, staging, production, etc.)
- **Variable Registry**: Define variables once and configure how they resolve across different environments
- **Merge Support**: Combine multiple variable registries for modular configuration
- **Secure Data Handling**: Built-in protection against accidental logging of sensitive values through redacted data patterns

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