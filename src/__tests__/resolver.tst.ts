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
        .addVar("VAR2", (v) => v
          .for("env1", "hardcoded", "value1"))
        .addVar("VAR3", (v) => v
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

  describe("getAll", () => {
    it("should be able to get all variables", () => {
      const res1 = varReg.createResolver("env1", { env: {} })
      expect(res1.getAll()).type.toBe<Promise<{
        VAR1: string
        VAR3: string
        VAR4: string
        VAR6: string
      }>>()

      const res2 = varReg.createResolver(
        "env2",
        { secrets: {} },
        { myDynamicVar: "myDynamicValue" },
      )
      expect(res2.getAll()).type.toBe<{
        VAR2: string
        VAR3: string
        VAR4: string
        VAR5: string
      }>()

      const res3 = varReg.createDynamicResolver({
        env1: [{ env: {} }],
        env2: [{ secrets: {} }, { myDynamicVar: "myDynamicValue" }],
      }, () => "env1")
      expect(res3.getAll()).type.toBe<{
        VAR3: string
        VAR4: string
      }>()

      const res4 = (0 as unknown as boolean) ? res1 : res2
      expect(res4.getAll()).type.toBe<
        | Promise<{
          VAR1: string
          VAR3: string
          VAR4: string
          VAR6: string
        }>
        | {
          VAR2: string
          VAR3: string
          VAR4: string
          VAR5: string
        }
      >()
    })
  })

  describe("getAllFor", () => {
    describe("validation", () => {
      it("should not allow getting variables from the same environment", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))

        const res = varReg.createResolver("env1", { env: {} })
        expect(res.getAllFor("env1", "hardcoded")).type.toRaiseError(
          "Argument of type '\"env1\"' is not assignable to parameter of type '\"env2\"'.",
        )
      })

      it("should not allow using resolution tags from wrong environment", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))

        const res = varReg.createResolver("env1", { env: {} })
        expect(res.getAllFor("env2", "from-env")).type.toRaiseError(
          "Argument of type '\"from-env\"' is not assignable to parameter of type '\"hardcoded\" | \"async-res\" | \"from-secrets\"'",
        )
      })

      it("should require all variables to be defined in current environment", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))
          .addVar("VAR2", (v) => v
            .for("env2", "hardcoded", "value4"))

        const res = varReg.createResolver("env1", { env: {} })
        expect(res.getAllFor("env2", "hardcoded")).type.toRaiseError(
          "Expected 3 arguments, but got 2.",
        )
      })
    })

    describe("sync resolution", () => {
      it("should return variables that use the specified tag in target environment", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))

        const res = varReg.createResolver("env1", { env: {} })
        expect(res.getAllFor("env2", "hardcoded")).type.toBe<{
          VAR1: string
        }>()
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        expect(res.getAllFor("env2", "from-secrets")).type.toBe<{}>()
      })

      it("should return multiple variables with the same tag", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value3")
            .for("env2", "hardcoded", "value4"))

        const res = varReg.createResolver("env1", { env: {} })
        expect(res.getAllFor("env2", "hardcoded")).type.toBe<{
          VAR1: string
          VAR2: string
        }>()
      })

      it("should only return variables defined in both environments", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value3"))

        const res = varReg.createResolver("env1", { env: {} })
        expect(res.getAllFor("env2", "hardcoded")).type.toBe<{
          VAR1: string
        }>()
      })

      it("should handle different resolution types correctly", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value4")
            .for("env2", "from-secrets"))
          .addVar("VAR3", (v) => v
            .for("env1", "hardcoded", "value5")
            .for("env2", "async-res"))
          .addVar("VAR4", (v) => v
            .for("env1", "hardcoded", "value6")
            .dynamicFor("env2", "myDynamicVar"))

        const res = varReg.createResolver("env1", { env: {} })
        expect(res.getAllFor("env2", "hardcoded")).type.toBe<{
          VAR1: string
        }>()

        expect(res.getAllFor("env2", "from-secrets")).type.toBe<{
          VAR2: string
        }>()

        expect(res.getAllFor("env2", "async-res")).type.toBe<{
          VAR3: string
        }>()
      })
    })

    describe("async resolution", () => {
      it("should return Promise when variable has async resolution in current env", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "async-res")
            .for("env2", "hardcoded", "value2"))

        const res1 = varReg.createResolver("env1", { env: {} })
        const res2 = varReg.createResolver("env2", { secrets: {} })

        expect(res1.getAllFor("env2", "hardcoded")).type.toBe<Promise<{
          VAR1: string
        }>>()

        expect(res2.getAllFor("env1", "async-res")).type.toBe<{
          VAR1: string
        }>()
      })

      it("should return Promise when any variable has async resolution in current env", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "async-res")
            .for("env2", "hardcoded", "value2"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))
          .addVar("VAR3", (v) => v
            .for("env1", "hardcoded", "value3")
            .for("env2", "from-secrets"))

        const res = varReg.createResolver("env1", { env: {} })

        expect(res.getAllFor("env2", "hardcoded")).type.toBe<Promise<{
          VAR1: string
          VAR2: string
        }>>()

        expect(res.getAllFor("env2", "from-secrets")).type.toBe<{
          VAR3: string
        }>()
      })

      it("should return Promise when multiple variables have async resolution in current env", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "async-res")
            .for("env2", "hardcoded", "value2"))
          .addVar("VAR2", (v) => v
            .for("env1", "async-res")
            .for("env2", "hardcoded", "value2"))

        const res = varReg.createResolver("env1", { env: {} })
        expect(res.getAllFor("env2", "hardcoded")).type.toBe<Promise<{
          VAR1: string
          VAR2: string
        }>>()
      })
    })

    describe("with dynamic resolvers", () => {
      const dynamicEnvReg = createEnvironmentRegistry()
        .addEnv("env1", defineType<{ env1Data: Record<string, string> }>(), (env) => env
          .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
          .addResolution("from-env1", defineType<undefined>(), (data) =>
            data.envData.env1Data[data.variableName])
          .addResolution("async-res", defineType<undefined>(), () => Promise.resolve("async-value")))
        .addEnv("env2", defineType<{ env2Data: Record<string, string> }>(), (env) => env
          .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
          .addResolution("from-env2", defineType<undefined>(), (data) =>
            data.envData.env2Data[data.variableName])
          .addResolution("async-res", defineType<undefined>(), () => Promise.resolve("async-value")))
        .addEnv("env3", defineType<{ env3Data: Record<string, string> }>(), (env) => env
          .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
          .addResolution("from-env3", defineType<undefined>(), (data) =>
            data.envData.env3Data[data.variableName])
          .addResolution("async-res", defineType<undefined>(), () => Promise.resolve("async-value")))
        .addEnv("env4", defineType<{ env4Data: Record<string, string> }>(), (env) => env
          .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
          .addResolution("from-env4", defineType<undefined>(), (data) =>
            data.envData.env4Data[data.variableName])
          .addResolution("async-res", defineType<undefined>(), () => Promise.resolve("async-value")))

      it("should not allow getting variables from possible environments", () => {
        const varReg = dynamicEnvReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .for("env3", "hardcoded", "value3"))

        const res = varReg.createDynamicResolver({
          env1: [{ env1Data: {} }],
          env2: [{ env2Data: {} }],
        }, () => "env1")

        expect(res.getAllFor("env1", "hardcoded")).type.toRaiseError(
          /Argument of type '"env1"' is not assignable to parameter of type '(.*)'./,
        )
        expect(res.getAllFor("env2", "hardcoded")).type.toRaiseError(
          /Argument of type '"env2"' is not assignable to parameter of type '(.*)'./,
        )
      })

      describe("variable accessibility", () => {
        it("should only allow variables present in all possible environments", () => {
          const varReg = dynamicEnvReg.createVariableRegistry()
            // Present in all envs with same resolution type - should be allowed
            .addVar("COMMON_SAME_RES", (v) => v
              .for("env1", "hardcoded", "value1")
              .for("env2", "hardcoded", "value2")
              .for("env3", "hardcoded", "value3"))
            // Present in all envs but different resolution types - should still be allowed
            .addVar("COMMON_DIFF_RES", (v) => v
              .for("env1", "from-env1")
              .for("env2", "from-env2")
              .for("env3", "hardcoded", "value3"))
            // Missing in env1 - should not be allowed
            .addVar("MISSING_ENV1", (v) => v
              .for("env2", "hardcoded", "value2")
              .for("env3", "hardcoded", "value3"))
            // Missing in env2 - should not be allowed
            .addVar("MISSING_ENV2", (v) => v
              .for("env1", "hardcoded", "value1")
              .for("env3", "hardcoded", "value3"))
            // Present in all envs but not in target - should not be allowed
            .addVar("NOT_IN_ENV3", (v) => v
              .for("env1", "hardcoded", "value1")
              .for("env2", "hardcoded", "value2"))

          const res = varReg.createDynamicResolver({
            env1: [{ env1Data: {} }],
            env2: [{ env2Data: {} }],
          }, () => "env1")

          // Should fail because some variables with "hardcoded" resolution in env3
          // (like MISSING_ENV1) are not defined in all possible environments
          // (MISSING_ENV1 is missing from env1), so we can't guarantee they
          // would be resolvable at runtime
          expect(res.getAllFor("env3", "hardcoded")).type.toRaiseError(
            "Expected 3 arguments, but got 2.",
          )
        })

        it("should return Promise if any possible environment has async resolution", () => {
          const varReg = dynamicEnvReg.createVariableRegistry()
            // Async in env1, sync in env2
            .addVar("VAR1", (v) => v
              .for("env1", "async-res")
              .for("env2", "hardcoded", "value2")
              .for("env3", "hardcoded", "value3"))
            // Sync in env1, async in env2
            .addVar("VAR2", (v) => v
              .for("env1", "hardcoded", "value1")
              .for("env2", "async-res")
              .for("env3", "hardcoded", "value3"))
            // Sync in both env1 and env2
            .addVar("VAR3", (v) => v
              .for("env1", "hardcoded", "value1")
              .for("env2", "hardcoded", "value2")
              .for("env3", "hardcoded", "value3"))

          const res = varReg.createDynamicResolver({
            env1: [{ env1Data: {} }],
            env2: [{ env2Data: {} }],
          }, () => "env1")

          // Should be Promise since VAR1 and VAR2 have async resolution in possible environments
          expect(res.getAllFor("env3", "hardcoded")).type.toBe<Promise<{
            VAR1: string
            VAR2: string
            VAR3: string
          }>>()
        })

        it("should allow accessing env3 variables when some unrelated variables have different resolutions", () => {
          const varReg = dynamicEnvReg.createVariableRegistry()
            .addVar("DIFF_RES", (v) => v
              .for("env1", "from-env1")
              .for("env2", "from-env2")
              .for("env3", "hardcoded", "value3"))
            .addVar("COMMON_RES", (v) => v
              .for("env1", "hardcoded", "value1")
              .for("env2", "hardcoded", "value2")
              .for("env3", "hardcoded", "value3"))
            .addVar("VAR3", (v) => v
              .for("env1", "hardcoded", "value1")
              .for("env2", "hardcoded", "value2")
              .for("env3", "from-env3"))
            .addVar("VAR4", (v) => v
              .for("env1", "async-res")
              .for("env2", "hardcoded", "value2")
              .for("env4", "hardcoded", "value4"))

          const res = varReg.createDynamicResolver({
            env1: [{ env1Data: {} }],
            env2: [{ env2Data: {} }],
          }, () => "env1")

          expect(res.getAllFor("env3", "hardcoded")).type.toBe<{
            COMMON_RES: string
            DIFF_RES: string
          }>()
          expect(res.getAllFor("env3", "from-env3")).type.toBe<{
            VAR3: string
          }>()
          expect(res.getAllFor("env4", "hardcoded")).type.toBe<Promise<{
            VAR4: string
          }>>()
        })

        it("should allow variables with different resolution types in possible environments", () => {
          const varReg = dynamicEnvReg.createVariableRegistry()
            // Different resolution types in possible environments
            .addVar("MIXED_RES", (v) => v
              .for("env1", "from-env1")
              .for("env2", "from-env2")
              .for("env3", "hardcoded", "value3"))
            // Same resolution type in possible environments
            .addVar("SAME_RES", (v) => v
              .for("env1", "hardcoded", "value1")
              .for("env2", "hardcoded", "value2")
              .for("env3", "hardcoded", "value3"))

          const res = varReg.createDynamicResolver({
            env1: [{ env1Data: {} }],
            env2: [{ env2Data: {} }],
          }, () => "env1")

          // Both SAME_RES and MIXED_RES should be accessible
          expect(res.getAllFor("env3", "hardcoded")).type.toBe<{
            SAME_RES: string
            MIXED_RES: string
          }>()
        })
      })

      it("should handle async resolution in any possible environment", () => {
        const varReg = dynamicEnvReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "async-res")
            .for("env2", "hardcoded", "value2")
            .for("env3", "hardcoded", "value3"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "async-res")
            .for("env3", "hardcoded", "value3"))

        const res = varReg.createDynamicResolver({
          env1: [{ env1Data: {} }],
          env2: [{ env2Data: {} }],
        }, () => "env1")

        // Should be Promise since variables have async resolution in possible environments
        expect(res.getAllFor("env3", "hardcoded")).type.toBe<Promise<{
          VAR1: string
          VAR2: string
        }>>()
      })

      it("should handle different resolution types in target environment", () => {
        const varReg = dynamicEnvReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .for("env3", "hardcoded", "value3"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .for("env3", "from-env3"))
          .addVar("VAR3", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .for("env3", "async-res"))

        const res = varReg.createDynamicResolver({
          env1: [{ env1Data: {} }],
          env2: [{ env2Data: {} }],
        }, () => "env1")

        expect(res.getAllFor("env3", "hardcoded")).type.toBe<{
          VAR1: string
        }>()

        expect(res.getAllFor("env3", "from-env3")).type.toBe<{
          VAR2: string
        }>()

        expect(res.getAllFor("env3", "async-res")).type.toBe<{
          VAR3: string
        }>()
      })

      it("should handle union of dynamic resolvers", () => {
        const varReg = dynamicEnvReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .for("env3", "hardcoded", "value3"))

        const res1 = varReg.createDynamicResolver({
          env1: [{ env1Data: {} }],
          env2: [{ env2Data: {} }],
        }, () => "env1")

        const res2 = varReg.createDynamicResolver({
          env2: [{ env2Data: {} }],
          env3: [{ env3Data: {} }],
        }, () => "env2")

        const res = (0 as unknown as boolean) ? res1 : res2

        expect(res.getAllFor("env3", "hardcoded")).type.toRaiseError(
          "This expression is not callable.",
        )
      })

      it("should handle dynamic variables in target environment", () => {
        const varReg = dynamicEnvReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .dynamicFor("env3", "myDynamicVar"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .for("env3", "hardcoded", "value3"))

        const res = varReg.createDynamicResolver({
          env1: [{ env1Data: {} }],
          env2: [{ env2Data: {} }],
        }, () => "env1")

        // Dynamic variables should be excluded from getAllFor results
        expect(res.getAllFor("env3", "hardcoded")).type.toBe<{
          VAR2: string
        }>()
      })

      it("should fail when target variable is not present in all possible environments", () => {
        const varReg = dynamicEnvReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .dynamicFor("env3", "myDynamicVar"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env3", "hardcoded", "value3"))
          .addVar("VAR3", (v) => v
            .for("env1", "async-res")
            .for("env2", "hardcoded", "value2")
            .for("env3", "hardcoded", "value3"))

        const res = varReg.createDynamicResolver({
          env1: [{ env1Data: {} }],
          env2: [{ env2Data: {} }],
        }, () => "env1")

        // Should fail because VAR2 is required for env3 hardcoded
        // but VAR2 is not present in env2 (only in env1)
        // and res is dynamic over env1 and env2
        // so it's not possible to resolve VAR2 for env3 hardcoded
        expect(res.getAllFor("env3", "hardcoded")).type.toRaiseError()
      })

      it("should return Promise when any variable has async resolution in current env for target env", () => {
        const varReg = dynamicEnvReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .dynamicFor("env3", "myDynamicVar"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2")
            .for("env3", "hardcoded", "value3"))
          .addVar("VAR3", (v) => v
            .for("env1", "async-res")
            .for("env2", "hardcoded", "value2")
            .for("env3", "hardcoded", "value3"))

        const res = varReg.createDynamicResolver({
          env1: [{ env1Data: {} }],
          env2: [{ env2Data: {} }],
        }, () => "env1")

        expect(res.getAllFor("env3", "hardcoded")).type.toBe<Promise<{
          VAR2: string
          VAR3: string
        }>>()

        // Should not be a promise because
        // there is no async resolution in env1 or env2 for
        // env3 variables with from-env3 resolution
        // since there is no such variable at all
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        expect(res.getAllFor("env3", "from-env3")).type.toBe<{}>()
        // should be the same for "env3" and "async-res"
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        expect(res.getAllFor("env3", "async-res")).type.toBe<{}>()
        // or for env4
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        expect(res.getAllFor("env4", "hardcoded")).type.toBe<{}>()
      })
    })

    describe("edge cases", () => {
      it("should handle dynamic variables in target environment", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .dynamicFor("env2", "myDynamicVar"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value2")
            .for("env2", "hardcoded", "value3"))

        const res = varReg.createResolver("env1", { env: {} })
        // Dynamic variables should be excluded from getAllFor results
        expect(res.getAllFor("env2", "hardcoded")).type.toBe<{
          VAR2: string
        }>()
      })

      it("should handle empty results correctly", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "from-secrets"))
          .addVar("VAR2", (v) => v
            .for("env1", "hardcoded", "value2")
            .for("env2", "async-res"))

        const res = varReg.createResolver("env1", { env: {} })
        // No variables use hardcoded in env2
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        expect(res.getAllFor("env2", "hardcoded")).type.toBe<{}>()
      })

      it("should not work with union of resolvers", () => {
        const varReg = envReg.createVariableRegistry()
          .addVar("VAR1", (v) => v
            .for("env1", "hardcoded", "value1")
            .for("env2", "hardcoded", "value2"))

        const res1 = varReg.createResolver("env1", { env: {} })
        const res2 = varReg.createResolver("env2", { secrets: {} })
        const res = (0 as unknown as boolean) ? res1 : res2

        expect(res.getAllFor("env2", "hardcoded")).type.toRaiseError(
          "This expression is not callable.",
        )
      })
    })
  })
})
