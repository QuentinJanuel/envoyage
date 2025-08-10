import { describe, it, expect } from "vitest"
import { createEnvironmentRegistry } from "../environment-registry"
import { defineType } from "../type-def"

describe("Environment Registry Integration", () => {
  it("should resolve variables successfully", async () => {
    const myEnvReg = createEnvironmentRegistry()
      .addEnv(
        "env1",
        defineType<{
          env: Record<string, string>
        }>(),
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
        defineType<{
          secrets: Record<string, string>
        }>(),
        (env) => env
          .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
          .addResolution("from-secrets", defineType<undefined>(), (data) =>
            data.envData.secrets[data.variableName]),
      )

    const myVarReg = myEnvReg.createVariableRegistry()
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

    expect(myVarReg.listVariables("env1", "hardcoded")).toEqual(["VAR1", "VAR3"])
    expect(myVarReg.listVariables("env1", "from-env")).toEqual(["VAR4"])
    expect(myVarReg.listVariables("env1", "async-res")).toEqual(["VAR6"])
    expect(myVarReg.listVariables("env2", "from-secrets")).toEqual(["VAR4"])
    expect(myVarReg.listVariables("env2", "hardcoded")).toEqual(["VAR2", "VAR3"])

    const env1Resolver = myVarReg.createResolver(
      "env1",
      { env: { VAR4: "value4-for-env1" } },
    )
    const env2Resolver = myVarReg.createResolver(
      "env2",
      { secrets: { VAR4: "value4-for-env2" } },
      { myDynamicVar: "myDynamicVarValue" },
    )

    expect(env1Resolver.get("VAR1")).toBe("value1")
    expect(() => env1Resolver.get("VAR2" as "VAR1")).toThrow()
    expect(env1Resolver.get("VAR3")).toBe("value3-for-env1")
    expect(env1Resolver.get("VAR4")).toBe("value4-for-env1")

    expect(() => env2Resolver.get("VAR1" as "VAR2")).toThrow()
    expect(env2Resolver.get("VAR2")).toBe("value2")
    expect(env2Resolver.get("VAR3")).toBe("value3-for-env2")
    expect(env2Resolver.get("VAR4")).toBe("value4-for-env2")
    expect(env2Resolver.get("VAR5")).toBe("myDynamicVarValue")

    await expect(env1Resolver.get("VAR6")).resolves.toBe("async-value")

    await expect(env1Resolver.getAll()).resolves.toEqual({
      VAR1: "value1",
      VAR3: "value3-for-env1",
      VAR4: "value4-for-env1",
      VAR6: "async-value",
    })
    expect(env2Resolver.getAll()).toEqual({
      VAR2: "value2",
      VAR3: "value3-for-env2",
      VAR4: "value4-for-env2",
      VAR5: "myDynamicVarValue",
    })
  })

  describe("getAllFor", () => {
    it("should return values from the current env for variables using the tag in the target env (sync)", () => {
      const myEnvReg = createEnvironmentRegistry()
        .addEnv(
          "env1",
          defineType<{
            env: Record<string, string>
          }>(),
          (env) => env
            .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
            .addResolution("from-env", defineType<undefined>(), (data) =>
              data.envData.env[data.variableName])
            .addResolution("async-res", defineType<undefined>(), async () => {
              await new Promise((resolve) => setTimeout(resolve, 10))
              return "async-value"
            }),
        )
        .addEnv(
          "env2",
          defineType<{
            secrets: Record<string, string>
          }>(),
          (env) => env
            .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
            .addResolution("from-secrets", defineType<undefined>(), (data) =>
              data.envData.secrets[data.variableName]),
        )

      const myVarReg = myEnvReg.createVariableRegistry()
        .addVar("VAR1", (v) => v.for("env1", "hardcoded", "value1"))
        .addVar("VAR2", (v) => v.for("env2", "hardcoded", "value2"))
        .addVar("VAR3", (v) => v
          .for("env1", "hardcoded", "value3-for-env1")
          .for("env2", "hardcoded", "value3-for-env2"))
        .addVar("VAR4", (v) => v
          .for("env1", "from-env")
          .for("env2", "from-secrets"))
        .addVar("VAR5", (v) => v.dynamicFor("env2", "myDynamicVar"))
        .addVar("VAR6", (v) => v.for("env1", "async-res"))

      expect(myVarReg.listVariables("env1", "hardcoded")).toEqual(["VAR1", "VAR3"])
      expect(myVarReg.listVariables("env1", "from-env")).toEqual(["VAR4"])
      expect(myVarReg.listVariables("env1", "async-res")).toEqual(["VAR6"])
      expect(myVarReg.listVariables("env2", "from-secrets")).toEqual(["VAR4"])
      expect(myVarReg.listVariables("env2", "hardcoded")).toEqual(["VAR2", "VAR3"])

      const env1Resolver = myVarReg.createResolver(
        "env1",
        { env: { VAR4: "value4-for-env1" } },
      )

      expect(env1Resolver.getAllFor("env2", "from-secrets")).toEqual({
        VAR4: "value4-for-env1",
      })
    })

    it("should return Promise when any included variable resolves async in the current env", async () => {
      const myEnvReg = createEnvironmentRegistry()
        .addEnv(
          "env1",
          defineType<{
            env: Record<string, string>
          }>(),
          (env) => env
            .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
            .addResolution("from-env", defineType<undefined>(), (data) =>
              data.envData.env[data.variableName])
            .addResolution("async-res", defineType<undefined>(), async () => {
              await new Promise((resolve) => setTimeout(resolve, 10))
              return "async-value"
            }),
        )
        .addEnv(
          "env2",
          defineType<{
            secrets: Record<string, string>
          }>(),
          (env) => env
            .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
            .addResolution("from-secrets", defineType<undefined>(), (data) =>
              data.envData.secrets[data.variableName]),
        )

      const myVarReg = myEnvReg.createVariableRegistry()
        .addVar("VAR3", (v) => v
          .for("env1", "hardcoded", "value3-for-env1")
          .for("env2", "hardcoded", "value3-for-env2"))
        // Async in current env (env1) but qualifies for target tag in env2
        .addVar("VAR7", (v) => v
          .for("env1", "async-res")
          .for("env2", "hardcoded", "value7-for-env2"))

      expect(myVarReg.listVariables("env1", "hardcoded")).toEqual(["VAR3"])
      expect(myVarReg.listVariables("env1", "from-env")).toEqual([])
      expect(myVarReg.listVariables("env1", "async-res")).toEqual(["VAR7"])
      expect(myVarReg.listVariables("env2", "from-secrets")).toEqual([])
      expect(myVarReg.listVariables("env2", "hardcoded")).toEqual(["VAR3", "VAR7"])

      const env1Resolver = myVarReg.createResolver(
        "env1",
        { env: {} },
      )

      await expect(env1Resolver.getAllFor("env2", "hardcoded")).resolves.toEqual({
        VAR3: "value3-for-env1",
        VAR7: "async-value",
      })
    })

    it("should exclude variables that are dynamic in the target env", () => {
      const myEnvReg = createEnvironmentRegistry()
        .addEnv(
          "env1",
          defineType<{
            env: Record<string, string>
          }>(),
          (env) => env
            .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
            .addResolution("from-env", defineType<undefined>(), (data) =>
              data.envData.env[data.variableName]),
        )
        .addEnv(
          "env2",
          defineType<{
            secrets: Record<string, string>
          }>(),
          (env) => env
            .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
            .addResolution("from-secrets", defineType<undefined>(), (data) =>
              data.envData.secrets[data.variableName]),
        )

      const myVarReg = myEnvReg.createVariableRegistry()
        .addVar("VAR3", (v) => v
          .for("env1", "hardcoded", "value3-for-env1")
          .for("env2", "hardcoded", "value3-for-env2"))
        // Dynamic in target env2 → must be excluded from getAllFor("env2", "hardcoded")
        .addVar("VAR8", (v) => v
          .for("env1", "hardcoded", "value8-for-env1")
          .dynamicFor("env2", "dynVar"))

      expect(myVarReg.listVariables("env1", "hardcoded")).toEqual(["VAR3", "VAR8"])
      expect(myVarReg.listVariables("env1", "from-env")).toEqual([])
      expect(myVarReg.listVariables("env2", "from-secrets")).toEqual([])
      expect(myVarReg.listVariables("env2", "hardcoded")).toEqual(["VAR3"])

      const env1Resolver = myVarReg.createResolver(
        "env1",
        { env: {} },
      )

      expect(env1Resolver.getAllFor("env2", "hardcoded")).toEqual({
        VAR3: "value3-for-env1",
      })
    })
  })

  describe("Dynamic Resolver", () => {
    const myEnvReg = createEnvironmentRegistry()
      .addEnv(
        "env1",
        defineType<{
          env: Record<string, string>
        }>(),
        (env) => env
          .addResolution("hardcoded", defineType<string>(), (data) => data.payload)
          .addResolution("from-env", defineType<undefined>(), (data) =>
            data.envData.env[data.variableName])
          .addResolution("async-res", defineType<undefined>(), async () => {
            await new Promise((resolve) => setTimeout(resolve, 100))
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
            await new Promise((resolve) => setTimeout(resolve, 100))
            return "async-value-env2"
          }),
      )

    const myVarReg = myEnvReg.createVariableRegistry()
      .addVar("VAR1", (v) => v.for("env1", "hardcoded", "value1"))
      .addVar("VAR2", (v) => v.for("env2", "hardcoded", "value2"))
      .addVar("VAR3", (v) => v
        .for("env1", "hardcoded", "value3-for-env1")
        .for("env2", "hardcoded", "value3-for-env2"))
      .addVar("VAR4", (v) => v
        .for("env1", "from-env")
        .for("env2", "from-secrets"))
      .addVar("VAR5", (v) => v.dynamicFor("env2", "myDynamicVar"))
      .addVar("VAR6", (v) => v.for("env1", "async-res"))
      .addVar("VAR7", (v) => v
        .for("env1", "hardcoded", "v7-sync")
        .for("env2", "async-res"))

    expect(myVarReg.listVariables("env1", "hardcoded")).toEqual(["VAR1", "VAR3", "VAR7"])
    expect(myVarReg.listVariables("env1", "from-env")).toEqual(["VAR4"])
    expect(myVarReg.listVariables("env1", "async-res")).toEqual(["VAR6"])
    expect(myVarReg.listVariables("env2", "from-secrets")).toEqual(["VAR4"])
    expect(myVarReg.listVariables("env2", "hardcoded")).toEqual(["VAR2", "VAR3"])
    expect(myVarReg.listVariables("env2", "async-res")).toEqual(["VAR7"])

    it("should work for a single-env dynamic resolver (env1)", async () => {
      const res = myVarReg.createDynamicResolver({
        env1: [{ env: { VAR4: "value4-for-env1" } }],
      }, () => "env1")

      expect(res.get("VAR1")).toBe("value1")
      expect(res.get("VAR3")).toBe("value3-for-env1")
      expect(res.get("VAR4")).toBe("value4-for-env1")
      expect(() => res.get("VAR5" as "VAR1")).toThrow()
      await expect(res.get("VAR6")).resolves.toBe("async-value")

      await expect(res.getAll()).resolves.toEqual({
        VAR1: "value1",
        VAR3: "value3-for-env1",
        VAR4: "value4-for-env1",
        VAR6: "async-value",
        VAR7: "v7-sync",
      })
    })

    it("should work for a single-env dynamic resolver (env2 with dynamic data)", async () => {
      const res = myVarReg.createDynamicResolver({
        env2: [{ secrets: { VAR4: "value4-for-env2" } }, { myDynamicVar: "dyn" }],
      }, () => "env2")

      expect(res.get("VAR2")).toBe("value2")
      expect(res.get("VAR3")).toBe("value3-for-env2")
      expect(res.get("VAR4")).toBe("value4-for-env2")
      expect(res.get("VAR5")).toBe("dyn")
      // VAR6 only exists in env1 → runtime error when missing definition
      expect(() => res.get("VAR6" as "VAR2")).toThrow()

      await expect(res.getAll()).resolves.toEqual({
        VAR2: "value2",
        VAR3: "value3-for-env2",
        VAR4: "value4-for-env2",
        VAR5: "dyn",
        VAR7: "async-value-env2",
      })
    })

    it("should default to async if any env resolution is async (env1 | env2)", async () => {
      for (const flag of [true, false]) {
        const res = myVarReg.createDynamicResolver({
          env1: [{ env: { VAR4: "value4-for-env1" } }],
          env2: [{ secrets: { VAR4: "value4-for-env2" } }, { myDynamicVar: "dyn" }],
        }, () => (flag ? "env1" : "env2"))

        // VAR3 is sync in both envs
        expect(res.get("VAR3")).toBe(flag ? "value3-for-env1" : "value3-for-env2")

        // VAR4 is sync for both envs
        expect(res.get("VAR4")).toBe(flag ? "value4-for-env1" : "value4-for-env2")

        // VAR7 is sync in env1 and async in env2 → type is Promise and awaiting works
        await expect(res.get("VAR7")).resolves.toBe(flag ? "v7-sync" : "async-value-env2")

        await expect(res.getAll()).resolves.toEqual({
          VAR3: flag ? "value3-for-env1" : "value3-for-env2",
          VAR4: flag ? "value4-for-env1" : "value4-for-env2",
          VAR7: flag ? "v7-sync" : "async-value-env2",
        })
      }
    })
  })
})
