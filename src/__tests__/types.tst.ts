import { describe, expect, it } from "tstyche"
import type { GetCommonVariableForEnv, GetName } from "../types"
import { createEnvironmentRegistry } from "../environment-registry"
import { defineType } from "../type-def"

const envReg = createEnvironmentRegistry()
  .addEnv(
    "env1",
    defineType<{ env: Record<string, string> }>(),
    (env) => env
      .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
      .addResolution("from-env", defineType<undefined | string>(), (data) =>
        data.envData.env[data.payload ?? data.variableName])
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
        data.envData.secrets[data.variableName])
      .addResolution("async-res", defineType<undefined>(), async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        return "async-value"
      }),
  )

describe("types", () => {
  describe("GetCommonVariableForEnv", () => {
    it("should the variables that are defined in all environments", () => {
      const _varReg = envReg.createVariableRegistry()
        .addVar("ENV1_ONLY", (v) => v
          .for("env1", "hardcoded", "value1"))
        .addVar("ENV2_ONLY", (v) => v
          .for("env2", "hardcoded", "value2"))
        .addVar("ENV1_AND_ENV2", (v) => v
          .for("env1", "hardcoded", "value1")
          .for("env2", "hardcoded", "value2"))

      type ENV1_VARS = GetName<GetCommonVariableForEnv<
        typeof envReg,
        "env1",
        (typeof _varReg)["variables"][number]
      >>
      expect<ENV1_VARS>().type.toBe<"ENV1_ONLY" | "ENV1_AND_ENV2">()

      type ENV2_VARS = GetName<GetCommonVariableForEnv<
        typeof envReg,
        "env2",
        (typeof _varReg)["variables"][number]
      >>
      expect<ENV2_VARS>().type.toBe<"ENV2_ONLY" | "ENV1_AND_ENV2">()

      type ENV1_AND_ENV2_VARS = GetName<GetCommonVariableForEnv<
        typeof envReg,
        "env1" | "env2",
        (typeof _varReg)["variables"][number]
      >>
      expect<ENV1_AND_ENV2_VARS>().type.toBe<"ENV1_AND_ENV2">()
    })
  })
})
