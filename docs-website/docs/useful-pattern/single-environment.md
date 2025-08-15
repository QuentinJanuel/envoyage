# Using a Single Environment Pattern

A common pattern in applications is to have a single "app" environment that reads from `.env` files, while using other environments (CI, Lambda, etc.) to generate those `.env` files. This pattern ensures type safety across all environments and makes it easy to manage environment variables in different contexts.

## The Pattern

First, set up your environment registry with an "app" environment that reads from `.env` and other environments that source variables from their specific contexts:

```typescript
const envReg = createEnvironmentRegistry()
  // The main environment your app will use - reads from .env
  .addEnv("app", defineType<{ env: Record<string, string> }>(), (e) => e
    .addResolution("from-env", defineType<undefined>(), (data) =>
      data.envData.env[data.variableName]))
  
  // CI environment that sources variables from CI secrets
  .addEnv("ci", defineType<{ secrets: Record<string, string> }>(), (e) => e
    .addResolution("from-ci-secrets", defineType<undefined>(), (data) =>
      data.envData.secrets[data.variableName]))
  
  // Lambda environment that sources from AWS Secrets Manager
  .addEnv("lambda", defineType<{ awsSecrets: Record<string, string> }>(), (e) => e
    .addResolution("from-aws", defineType<undefined>(), (data) =>
      data.envData.awsSecrets[data.variableName]))

const varReg = envReg.createVariableRegistry()
  // Define variables that your app needs from .env
  .addVar("DATABASE_URL", (v) => v
    .for("app", "from-env")
    .for("ci", "from-ci-secrets")
    .for("lambda", "from-aws"))
  .addVar("REDIS_URL", (v) => v
    .for("app", "from-env")
    .for("ci", "from-ci-secrets")
    .for("lambda", "from-aws"))
  .addVar("API_KEY", (v) => v
    .for("app", "from-env")
    .for("ci", "from-ci-secrets")
    .for("lambda", "from-aws"))
```

## Using in Your Application

In your application code, you simply create a resolver that reads from process.env (which gets its values from .env):

```typescript
// Your application always uses the "app" environment
const appResolver = varReg.createResolver("app", { env: process.env })

// Use variables throughout your app
const dbUrl = appResolver.get("DATABASE_URL")
const redisUrl = appResolver.get("REDIS_URL")
const apiKey = appResolver.get("API_KEY")
```

## Generating .env Files

For environments like CI or Lambda that need to provide variables to your app, you create scripts to generate the .env file:

```typescript
// Script to generate .env file in CI
const generateCiEnv = async () => {
  // Create CI resolver with access to CI secrets
  const ciResolver = varReg.createResolver("ci", {
    secrets: loadCISecrets() // Your function to load CI secrets
  })

  // Get all variables that the app needs using from-env resolution
  // This will error if CI is missing any variables the app needs
  const envVars = await ciResolver.getAllFor("app", "from-env")
  
  // Generate .env content
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")
  
  // Write to .env file
  await fs.writeFile(".env", envContent)
}
```

## Why This Works

This pattern is powerful because:

1. Your application code is simple - it just reads from `.env` via the "app" environment
2. Type safety ensures that when you add a new variable to "app", you must define it in all source environments
3. `getAllFor("app", "from-env")` gets all variables needed by your app
4. Each environment can source its variables differently (CI secrets, AWS Secrets Manager, etc.)
5. The `.env` file acts as a clear contract between your app and its different deployment environments

## Best Practices

1. Keep your "app" environment simple, ideally just reading from `.env`
2. Create separate scripts for each environment that needs to generate a `.env` file
3. Consider adding validation to your generated `.env` files using the [validate .env pattern](./validate-dotenv.md)
