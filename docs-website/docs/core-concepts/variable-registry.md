# Variable Registry

The Variable Registry defines your variables and how they should be resolved in each environment. It acts as a central configuration that maps variable names to their resolution methods across different environments.

## Creating a Variable Registry

A Variable Registry is always created from an Environment Registry:

```typescript
const varReg = envReg.createVariableRegistry()
```

## Adding Variables

Variables are added using the `addVar` method, which takes:
1. The variable name (must be unique within the registry)
2. A configuration function that defines how the variable is resolved in different environments

```typescript
const varReg = envReg.createVariableRegistry()
  .addVar("DATABASE_URL", (v) => v
    .for("local", "from-env")
    .for("production", "from-secrets"))
  .addVar("IS_PRODUCTION", (v) => v
    .for("local", "hardcoded", "false")
    .for("production", "hardcoded", "true"))
  .addVar("API_KEY", (v) => v
    .for("local", "from-env", "LEGACY_API_KEY")
    .for("production", "from-secrets"))
```

### Resolution Configuration

For each environment, you specify:
1. The environment name
2. The resolution method to use
3. The resolution payload (can be omitted if it allows undefined values)

```typescript
.addVar("MY_VARIABLE", (v) => v
  // explicit payload
  .for("staging", "hardcoded", "staging-value")
  // omitted payload
  .for("local", "from-env")
)
```

:::info
Variables can also be configured dynamically, requiring the values to be provided when creating the resolver. Learn more about [dynamic variables](../advanced-usage/dynamic-variable.md).
:::

## Groups

You can organize related variables into separate registries and then combine them:

```typescript
// Database-related variables
const dbVarReg = envReg.createVariableRegistry()
  .addVar("DATABASE_URL", (v) => v
    .for("local", "hardcoded", "postgresql://localhost:5432/myapp")
    .for("production", "from-secrets"))
  .addVar("DATABASE_POOL_SIZE", (v) => v
    .for("local", "hardcoded", "10")
    .for("production", "from-env"))

// Authentication-related variables
const authVarReg = envReg.createVariableRegistry()
  .addVar("JWT_SECRET", (v) => v
    .for("local", "hardcoded", "dev-secret")
    .for("production", "from-secrets"))
  .addVar("AUTH_PROVIDER_URL", (v) => v
    .for("local", "from-env")
    .for("production", "from-secrets"))

// Combine into a global registry
const globalVarReg = envReg.createVariableRegistry()
  .mergeWith(dbVarReg)
  .mergeWith(authVarReg)
```

This pattern is useful for:
- Organizing variables by feature/module
- Sharing common configurations
- Breaking down large configurations into manageable pieces

### Merge Behavior

When merging variable registries:
- Variables from merged registries are added to the target registry
- Duplicate variable names across registries will result in TypeScript compilation errors
- All registries must be created from the same Environment Registry