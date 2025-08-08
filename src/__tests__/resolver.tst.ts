import { describe, expect, it } from "tstyche"
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

const varReg = envReg.createVariableRegistry()
  .addVar("VAR1", (v) => v
    .for("env1", "hardcoded", "value1"))
  .addVar("VAR2", (v) => v
    .for("env2", "hardcoded", "value2"))
  .addVar("VAR3", (v) => v
    .for("env1", "hardcoded", "value3-for-env1")
    .for("env2", "hardcoded", "value3-for-env2"))
  .addVar("VAR4", (v) => v
    .for("env1", "from-env")
    .for("env2", "from-secrets"))
  .addVar("VAR5", (v) => v
    .dynamicFor("env2", "myDynamicVar"))
  .addVar("VAR6", (v) => v
    .for("env1", "async-res"))

describe("Resolver", () => {
  describe("createResolver", () => {
    it("should be able to create a resolver", () => {
      expect(varReg.createResolver).type
        .toBeCallableWith("env1", { env: {} })
      expect(varReg.createResolver).type
        .toBeCallableWith("env2", { secrets: {} }, { myDynamicVar: "myDynamicValue" })
    })

    it("should not be able to create a resolver with an invalid environment name", () => {
      expect(
        varReg.createResolver("invalid", undefined, undefined),
      ).type.toRaiseError("Argument of type '\"invalid\"' is not assignable to parameter of type '\"env1\" | \"env2\"'.")
    })

    it("should not be able to create a resolver with an invalid environment data", () => {
      expect(
        varReg.createResolver("env1", { secrets: {} }),
      ).type.toRaiseError("Object literal may only specify known properties, and 'secrets' does not exist in type '{ env: Record<string, string>; }'.")
      expect(
        varReg.createResolver("env2", { env: {} }, {}),
      ).type.toRaiseError("Object literal may only specify known properties, and 'env' does not exist in type '{ secrets: Record<string, string>; }'.")
    })

    it("should not be able to create a resolver with an invalid dynamic data", () => {
      expect(
        varReg.createResolver("env1", { env: {} }, { myDynamicVar: "value" }),
      ).type.toRaiseError("Argument of type '{ myDynamicVar: string; }' is not assignable to parameter of type 'undefined'.")
      expect(
        varReg.createResolver("env2", { secrets: {} }, { invalid: "value" }),
      ).type.toRaiseError("Object literal may only specify known properties, and 'invalid' does not exist in type '{ myDynamicVar: string; }'.")
    })

    it("should require dynamic variables to be provided", () => {
      const varReg = envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded", "value1"))
        .addVar("VAR2", (v) => v
          .dynamicFor("env1", "var2"))
        .addVar("VAR3", (v) => v
          .dynamicFor("env1", "var3ForEnv1")
          .dynamicFor("env2", "var3ForEnv2"))

      expect(
        varReg.createResolver("env1", { env: {} }, {
          var2: "value2",
          var3ForEnv1: "value3-for-env1",
        }),
      ).type.not.toRaiseError()

      expect(
        varReg.createResolver("env2", { secrets: {} }, {
          var3ForEnv2: "value3-for-env2",
        }),
      ).type.not.toRaiseError()

      expect(
        varReg.createResolver("env1", { env: {} }),
      ).type.toRaiseError("Expected 3 arguments, but got 2.")
    })

    it("should allow 2 arguments if there is no dynamic variables", () => {
      const varReg = envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded", "value1"))

      expect(
        varReg.createResolver("env1", { env: {} }),
      ).type.not.toRaiseError()
    })

    it("should not accept extra dynamic variables", () => {
      const varReg = envReg.createVariableRegistry()
        .addVar("VAR", (v) => v
          .dynamicFor("env1", "var1"))

      // If passed directly
      expect(
        varReg.createResolver("env1", { env: {} }, {
          var1: "value1",
          invalid: "value2",
        }),
      ).type.toRaiseError("Argument of type '{ var1: string; invalid: string; }' is not assignable to parameter of type 'never'.")

      // If passed as an object
      const obj = {
        var1: "value1",
        invalid: "value2",
      }
      expect(
        varReg.createResolver("env1", { env: {} }, obj),
      ).type.toRaiseError("Argument of type '{ var1: string; invalid: string; }' is not assignable to parameter of type 'never'.")
    })

    it("should be able to infer sync status", () => {
      const resolver = varReg.createResolver("env1", { env: {} })
      expect(resolver.get("VAR1")).type.toBe<string>()
      expect(resolver.get("VAR6")).type.toBe<Promise<string>>()
    })
  })

  describe("createDynamicResolver", () => {
    it("should be able to create a dynamic resolver", () => {
      expect(
        varReg.createDynamicResolver({
          env1: [{ env: {} }],
          env2: [{ secrets: {} }, { myDynamicVar: "myDynamicValue" }],
        }, () => "env1"),
      ).type.not.toRaiseError()
    })

    it("should not be able to create a dynamic resolver with an invalid environment name", () => {
      expect(
        varReg.createDynamicResolver({
          env1: [{ env: {} }],
          env2: [{ secrets: {} }, { myDynamicVar: "myDynamicValue" }],
        }, () => "invalid"),
      ).type.toRaiseError("Type '\"invalid\"' is not assignable to type '\"env1\" | \"env2\"'.")

      expect(
        varReg.createDynamicResolver({
          invalid: [{ env: {} }],
        }, () => "env1"),
      ).type.toRaiseError(/Object literal may only specify known properties, and 'invalid' does not exist in type '(.*)'./)
    })

    it("should allow no env", () => {
      expect(
        varReg.createDynamicResolver({}, () => 0 as never),
      ).type.not.toRaiseError()
    })

    it("should allow a single env", () => {
      expect(
        varReg.createDynamicResolver({
          env1: [{ env: {} }],
        }, () => "env1"),
      ).type.not.toRaiseError()

      expect(
        varReg.createDynamicResolver({
          env2: [{ secrets: {} }, { myDynamicVar: "myDynamicValue" }],
        }, () => "env2"),
      ).type.not.toRaiseError()

      expect(
        varReg.createDynamicResolver({
          env1: [{ env: {} }],
        }, () => "env2"),
      ).type.toRaiseError("Type '\"env2\"' is not assignable to type '\"env1\"'.")
    })

    it("should type the env data correctly", () => {
      expect(
        varReg.createDynamicResolver({
          env1: [{ env: {} }],
        }, () => "env1"),
      ).type.not.toRaiseError()

      expect(
        varReg.createDynamicResolver({
          env1: [{ secrets: {} }],
        }, () => "env1"),
      ).type.toRaiseError(/Object literal may only specify known properties, and 'secrets' does not exist in type '(.*)'/)
    })

    it("should type the dynamic data correctly", () => {
      // Require if exists
      expect(
        varReg.createDynamicResolver({
          env2: [{ secrets: {} }, { myDynamicVar: "myDynamicValue" }],
        }, () => "env2"),
      ).type.not.toRaiseError()
      expect(
        varReg.createDynamicResolver({
          env2: [{ secrets: {} }, { invalid: "myDynamicValue" }],
        }, () => "env2"),
      ).type.toRaiseError("Object literal may only specify known properties, and 'invalid' does not exist in type '{ myDynamicVar: string; }'.")

      // Optional if not exists
      expect(
        varReg.createDynamicResolver({
          env1: [{ env: {} }],
        }, () => "env1"),
      ).type.not.toRaiseError()
      expect(
        varReg.createDynamicResolver({
          env1: [{ env: {} }, undefined],
        }, () => "env1"),
      ).type.not.toRaiseError()
    })

    it("should only allow variables defined in all possible environments", () => {
      const varReg = envReg.createVariableRegistry()
        .addVar("ENV1_ONLY", (v) => v
          .for("env1", "hardcoded", "value1"))
        .addVar("ENV2_ONLY", (v) => v
          .for("env2", "hardcoded", "value2"))
        .addVar("ENV1_AND_ENV2", (v) => v
          .for("env1", "hardcoded", "value1")
          .for("env2", "hardcoded", "value2"))

      const env1Res = varReg.createDynamicResolver({
        env1: [{ env: {} }],
      }, () => "env1")
      const env2Res = varReg.createDynamicResolver({
        env2: [{ secrets: {} }],
      }, () => "env2")
      const env1AndEnv2Res = varReg.createDynamicResolver({
        env1: [{ env: {} }],
        env2: [{ secrets: {} }],
      }, () => "env1")

      // env1Res
      expect(env1Res.get("ENV1_ONLY")).type.toBe<string>()
      expect(env1Res.get("ENV2_ONLY")).type.toRaiseError(
        /Argument of type '"ENV2_ONLY"' is not assignable to parameter of type '(.*)'./,
      )
      expect(env1Res.get("ENV1_AND_ENV2")).type.toBe<string>()
      // env2Res
      expect(env2Res.get("ENV1_ONLY")).type.toRaiseError(
        /Argument of type '"ENV1_ONLY"' is not assignable to parameter of type '(.*)'./,
      )
      expect(env2Res.get("ENV2_ONLY")).type.toBe<string>()
      expect(env2Res.get("ENV1_AND_ENV2")).type.toBe<string>()
      // env1AndEnv2Res
      expect(env1AndEnv2Res.get("ENV1_ONLY")).type.toRaiseError()
      expect(env1AndEnv2Res.get("ENV2_ONLY")).type.toRaiseError()
      expect(env1AndEnv2Res.get("ENV1_AND_ENV2")).type.toBe<string>()
    })

    it("should be sync if all variables are sync", () => {
      const varReg = envReg.createVariableRegistry()
        .addVar("VAR", (v) => v
          .for("env1", "hardcoded", "value1")
          .for("env2", "hardcoded", "value2"))

      const res = varReg.createDynamicResolver({
        env1: [{ env: {} }],
        env2: [{ secrets: {} }],
      }, () => "env1")

      expect(res.get("VAR")).type.toBe<string>()
    })

    it("should be async if any variable is async", () => {
      const varReg = envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "async-res")
          .for("env2", "hardcoded", "value"))
        .addVar("VAR2", (v) => v
          .for("env1", "hardcoded", "value")
          .for("env2", "async-res"))
        .addVar("VAR3", (v) => v
          .for("env1", "async-res")
          .for("env2", "async-res"))

      const res = varReg.createDynamicResolver({
        env1: [{ env: {} }],
        env2: [{ secrets: {} }],
      }, () => "env1")

      expect(res.get("VAR1")).type.toBe<Promise<string>>()
      expect(res.get("VAR2")).type.toBe<Promise<string>>()
      expect(res.get("VAR3")).type.toBe<Promise<string>>()
    })

    it("should be detected as sync if the async resolutions are for different environments", () => {
      const envReg = createEnvironmentRegistry()
        .addEnv("env1", defineType<undefined>(), (env) => env
          .addResolution("async-res", defineType<undefined>(), async () => {
            await new Promise((resolve) => setTimeout(resolve, 200))
            return "async-value"
          })
          .addResolution("sync-res", defineType<undefined>(), () => "sync-value"))
        .addEnv("env2", defineType<undefined>(), (env) => env
          .addResolution("async-res", defineType<undefined>(), async () => {
            await new Promise((resolve) => setTimeout(resolve, 200))
            return "async-value"
          })
          .addResolution("sync-res", defineType<undefined>(), () => "sync-value"))
        .addEnv("env3", defineType<undefined>(), (env) => env
          .addResolution("async-res", defineType<undefined>(), async () => {
            await new Promise((resolve) => setTimeout(resolve, 200))
            return "async-value"
          })
          .addResolution("sync-res", defineType<undefined>(), () => "sync-value"))
      const varReg = envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "async-res")
          .for("env2", "sync-res")
          .for("env3", "sync-res"))

      const res = varReg.createDynamicResolver({
        env2: [undefined],
        env3: [undefined],
      }, () => "env2")

      expect(res.get("VAR1")).type.toBe<string>()
    })
  })

  describe("get", () => {
    it("should be able to get a variable", () => {
      const resolver = varReg.createResolver("env1", { env: {} })
      expect(resolver.get("VAR1")).type.toBe<string>()
      expect(resolver.get("VAR2")).type.toRaiseError(
        "Argument of type '\"VAR2\"' is not assignable to parameter of type '\"VAR1\" | \"VAR3\" | \"VAR4\" | \"VAR6\"'.",
      )
      expect(resolver.get("VAR3")).type.toBe<string>()
      expect(resolver.get("VAR4")).type.toBe<string>()
      expect(resolver.get("VAR5")).type.toRaiseError(
        "Argument of type '\"VAR5\"' is not assignable to parameter of type '\"VAR1\" | \"VAR3\" | \"VAR4\" | \"VAR6\"'.",
      )
      expect(resolver.get("VAR6")).type.toBe<Promise<string>>()
      expect(resolver.get("VAR7")).type.toRaiseError(
        "Argument of type '\"VAR7\"' is not assignable to parameter of type '\"VAR1\" | \"VAR3\" | \"VAR4\" | \"VAR6\"'.",
      )
    })

    it("should not allow if the resolver is a union of resolvers", () => {
      // even if all the resolvers in the union have the same variable
      // the resolver should not be able to get the variable
      const varReg = envReg.createVariableRegistry()
        .addVar("VAR", (v) => v
          .for("env1", "hardcoded", "value1")
          .for("env2", "hardcoded", "value2"))

      const res1 = varReg.createResolver("env1", { env: {} })
      const res2 = varReg.createResolver("env2", { secrets: {} })

      const condition = 0 as unknown as boolean
      const res = condition ? res1 : res2

      expect(res.get("VAR")).type.toRaiseError(
        "This expression is not callable.",
      )
    })
  })
})
