# Validating .env Files

A common challenge when working with environment variables is ensuring that all required variables are present in your `.env` file. With envoyage, you can easily check for missing or extra variables.

## The Pattern

Let's say you have a "local" environment that uses the "from-env" resolution to read variables from a `.env` file:

```typescript
const envReg = createEnvironmentRegistry()
  .addEnv("local", /* ... */, (e) => e
    .addResolution("from-env", /* ... */))
  .addEnv(/* ... */)
```

You can validate your `.env` file by comparing the variables defined in your code against those present in the `.env` file:

```typescript
import * as fs from "fs/promises"
import * as dotenv from "dotenv"

// Function to validate .env file
const validateEnv = async function () {
  // Get all variables that use "from-env" in the local environment
  const requiredVars = varReg.listVariables("local", "from-env")
  
  // Read actual variables from .env file
  const envContent = await fs.readFile(".env", "utf-8")
  const actualVars = Object.keys(dotenv.parse(envContent))
  
  // Find missing and extra variables
  const missingVars = requiredVars.filter(v => !actualVars.includes(v))
  const extraVars = actualVars.filter(v => !requiredVars.includes(v))
  
  // Report validation results
  if (missingVars.length > 0) {
    console.error("❌ Missing required variables in .env:")
    missingVars.forEach(v => console.error(`  - ${v}`))
    process.exit(1)
  }
  
  if (extraVars.length > 0) {
    console.warn("⚠️  Extra variables found in .env:")
    extraVars.forEach(v => console.warn(`  - ${v}`))
  }
  
  if (missingVars.length === 0) {
    console.log("✅ All required variables are present in .env")
  }
}
```

You can run this validation when your application starts or as part of your development workflow.

