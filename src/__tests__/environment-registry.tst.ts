import { describe, expect, it } from "tstyche"
import type { EnvironmentRegistry } from "../environment-registry.js"
import { createEnvironmentRegistry } from "../environment-registry.js"
import { defineType } from "../type-def.js"
import type { Environment } from "../environment.js"
import type { Resolution } from "../resolution.js"

describe("environment registry", () => {
  it("should define an environment registry with the correct type", () => {
    const envReg = createEnvironmentRegistry()
      .addEnv(
        "env1",
        defineType<{ env: Record<string, string> }>(),
        (env) => env
          .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
          .addResolution("from-env", defineType<undefined>(), (data) =>
            data.envData.env[data.variableName])
          .addResolution("async-res", defineType<undefined>(), async () => {
            await new Promise((resolve) => setTimeout(resolve, 200))
            return "async-value"
          }),
      )
      .addEnv(
        "env2",
        defineType<{ secrets: Record<string, string> }>(),
        (env) => env
          .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
          .addResolution("from-secrets", defineType<undefined>(), (data) =>
            data.envData.secrets[data.variableName]),
      )

    expect(envReg).type.toBe<
      EnvironmentRegistry<
        | Environment<
          "env1",
          { env: Record<string, string> },
          | Resolution<
            "hardcoded",
            { env: Record<string, string> },
            string,
            "sync"
          >
          | Resolution<
            "from-env",
            { env: Record<string, string> },
            undefined,
            "sync"
          >
          | Resolution<
            "async-res",
            { env: Record<string, string> },
            undefined,
            "async"
          >
        >
        | Environment<
          "env2",
          { secrets: Record<string, string> },
          | Resolution<
            "hardcoded",
            { secrets: Record<string, string> },
            string,
            "sync"
          >
          | Resolution<
            "from-secrets",
            { secrets: Record<string, string> },
            undefined,
            "sync"
          >
        >
      >
    >()
  })

  it("should not be able to create an environment with a duplicate name", () => {
    expect(
      createEnvironmentRegistry()
        .addEnv("env1", defineType<undefined>(), (env) => env)
        .addEnv("env1", defineType<undefined>(), (env) => env),
    ).type.toRaiseError("Argument of type '\"env1\"' is not assignable to parameter of type 'never'.")
  })

  it("should not be able to create a resolution with a duplicate name", () => {
    expect(
      createEnvironmentRegistry()
        .addEnv("env", defineType<undefined>(), (env) => env
          .addResolution("res1", defineType<undefined>(), () => "")
          .addResolution("res1", defineType<undefined>(), () => "")),
    ).type.toRaiseError("Argument of type '\"res1\"' is not assignable to parameter of type 'never'.")
  })

  it("resolve function should return a string or string promise", () => {
    expect(
      createEnvironmentRegistry()
        .addEnv("env", defineType<undefined>(), (env) => env
          .addResolution("res1", defineType<undefined>(), () => 0)),
    ).type.toRaiseError("Type 'number' is not assignable to type 'Promise<string>'.")

    expect(
      createEnvironmentRegistry()
        .addEnv("env", defineType<undefined>(), (env) => env
          .addResolution("res1", defineType<undefined>(), () => "")),
    ).type.not.toRaiseError()

    expect(
      createEnvironmentRegistry()
        .addEnv("env", defineType<undefined>(), (env) => env
          .addResolution("res1", defineType<undefined>(), () => Promise.resolve(""))),
    ).type.not.toRaiseError()
  })
})

