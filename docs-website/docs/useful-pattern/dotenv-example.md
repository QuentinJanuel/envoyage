# Generating .env.example

A common need when using environment variables is to provide a `.env.example` file that shows developers what variables they need to set up. With envoyage, you can automatically generate this file using the `listVariables` method.

## The Pattern

Let's say you have a "local" environment that uses the "from-env" resolution to read variables from a `.env` file:

```typescript
const envReg = createEnvironmentRegistry()
  .addEnv("local", /* ... */, (e) => e
    .addResolution("from-env", /* ... */)
  .addEnv(/* ... */)
```

You can generate a `.env.example` file by listing all variables that use the "from-env" resolution in the "local" environment:

```typescript
// Get all variables that use "from-env" in the local environment
const localEnvVars = varReg.listVariables("local", "from-env")
// Returns: ["DATABASE_URL", "REDIS_URL", "API_KEY"]

// Generate .env.example content
const envExample = localEnvVars
  .map(key => `${key}=`)
  .join("\n")

// Write to file
fs.writeFileSync(".env.example", envExample)
```

This will create a `.env.example` file like:
```env
DATABASE_URL=
REDIS_URL=
API_KEY=
```

## Why This Works

The `listVariables` method is designed to find all variables that use a specific resolution method in a target environment. In this case:

1. We ask for all variables that use "from-env" in the "local" environment
2. The method returns an array of variable names
3. We can use this to generate our example file

This pattern ensures that your `.env.example` stays in sync with your codebase, as it's generated directly from your variable definitions.