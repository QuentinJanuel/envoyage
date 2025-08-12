# Dynamic Variables

## Motivation

Consider a scenario where you're deploying an AWS Lambda function that needs access to various AWS resources. Some of these resources might not exist until deployment time, like an S3 bucket created as part of your infrastructure.

In this case, if we want to define a variable for the bucket name, we can do it like this:


```typescript
const envReg = createEnvironmentRegistry()
  .addEnv(
    "lambda",
    defineType<{
      env: Record<string, string>
      // Need to add a new field for the bucket
      bucketName: string
    }>(),
    (env) => env
      .addResolution("from-env", defineType<undefined>(), (data) =>
        data.envData.env[data.variableName])
      // Need to create a new resolution as well
      .addResolution("bucket-name", defineType<undefined>(), (data) =>
        data.envData.bucketName)
  )

const varReg = envReg.createVariableRegistry()
  .addVar("API_KEY", (v) => v
    .for("lambda", "from-env"))
  // We can define the variable using the special resolution we created
  .addVar("BUCKET_NAME", (v) => v
    .for("lambda", "bucket-name"))
```

Now envoyage enforces that you provide the bucket name when creating the resolver:

```typescript
const resolver = varReg.createResolver(
  "lambda",
  {
    env: process.env,
    bucketName: "my-generated-bucket-name",
  }
)
```

However, this approach is cumbersome, as we say each dynamic variable would require us to modify the environment data structure and create a new resolution method.

## Simplified API

Dynamic variables provide a more elegant solution. Instead of creating special resolutions, you can mark variables as dynamic and provide their values when creating the resolver:

```typescript
const varReg = envReg.createVariableRegistry()
  .addVar("UPLOADS_BUCKET", (v) => v
    .dynamicFor("lambda", "bucketName"))  // Mark as dynamic
  .addVar("API_KEY", (v) => v
    .for("lambda", "from-env"))

// Provide dynamic values at runtime
const resolver = varReg.createResolver(
  "lambda",
  { env: process.env },
  { bucketName: "my-generated-bucket-name" },
)
```

This achieves the same result but is much cleaner and more maintainable.

## Basic Usage

Instead of using `.for()`, use `.dynamicFor()` to mark a variable as dynamic in a specific environment. Like `.for()`, the first argument is the environment name, but the second argument defines the name of the dynamic value that must be provided when creating the resolver, the resolver will expect an object with this name as a key:

```typescript
const varReg = envReg.createVariableRegistry()
  .addVar("DOCUMENT_BUCKET", (v) => v
    // Envoyage will require the value to be provided when creating a resolver
    .dynamicFor("lambda", "bucketName"))
```

When creating a resolver for an environment with dynamic variables, you must provide their values:

```typescript
// Must provide values for all dynamic variables
const resolver = varReg.createResolver(
  "lambda",
  { env: process.env },  // Environment data
  {
    // Dynamic values
    bucketName: "..."
  },
)

// TypeScript error: missing bucketName
const badResolver = varReg.createResolver(
  "local",
  { env: {} },
)
```
