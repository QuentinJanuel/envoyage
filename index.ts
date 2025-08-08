import { createEnvironmentRegistry } from "./src/environment-registry.js"
import { defineType } from "./src/type-def.js"

const envReg = createEnvironmentRegistry()
  // local environment
  .addEnv(
    "local",
    // env data contains environment variables from .env file
    defineType<{ env: Record<string, string> }>(),
    (env) => env
      // can be hardcoded
      .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
      // can be resolved from environment variables
      .addResolution("from-env", defineType<string | undefined>(), (data) =>
        data.envData.env[data.payload ?? data.variableName]),
  )
  // workflows environment
  .addEnv(
    "workflows",
    defineType<{ githubSecrets: Record<string, string> }>(),
    (env) => env
      // can be hardcoded
      .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
      // can be resolved from github secrets
      .addResolution("from-github-secrets", defineType<string | undefined>(), (data) =>
        data.envData.githubSecrets[data.payload ?? data.variableName])
      // can be resolved from aws secrets
      .addResolution("from-aws-secrets", defineType<undefined>(), async (data) => {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return `secret for ${data.variableName} from aws`
      }),
  )

const openAIVarReg = envReg.createVariableRegistry()
  .addVar("OPENAI_API_KEY", (v) => v
    .for("workflows", "from-aws-secrets")
    .for("local", "from-env"))
  .addVar("OPENAI_API_BASE", (v) => v
    .for("workflows", "from-aws-secrets")
    .for("local", "from-env"))
  .addVar("OPENAI_API_MODEL", (v) => v
    .for("workflows", "from-aws-secrets")
    .for("local", "from-env"))

const globalVarReg = envReg.createVariableRegistry()
  .mergeWith(openAIVarReg)
  .addVar("IS_WORKFLOW", (v) => v
    .for("workflows", "hardcoded", "true")
    .for("local", "hardcoded", "false"))
  .addVar("DATABASE_URL", (v) => v
    .for("workflows", "from-github-secrets", "database-url")
    .for("local", "from-env"))
  .addVar("DOCUMENT_BUCKET", (v) => v
    .dynamicFor("local", "documentBucket"))

const res = globalVarReg.createResolver(
  "local",
  // env data needs to be provided to the resolver
  { env: { DATABASE_URL: "test" } },
  { documentBucket: "my document bucket name" },
)

console.log(res.get("IS_WORKFLOW")) // false
console.log(res.get("DATABASE_URL")) // "test"
console.log(res.get("DOCUMENT_BUCKET")) // "my document bucket name"

const workflowsRes = globalVarReg.createResolver(
  "workflows",
  { githubSecrets: { DATABASE_URL: "database-url" } },
)

console.log(workflowsRes.get("IS_WORKFLOW")) // true
console.log(await workflowsRes.get("OPENAI_API_KEY")) // "secret for OPENAI_API_KEY from aws"
