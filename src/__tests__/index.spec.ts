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

    it("should work for a single–env dynamic resolver (env1)", async () => {
      const res = myVarReg.createDynamicResolver({
        env1: [{ env: { VAR4: "value4-for-env1" } }],
      }, () => "env1")

      expect(res.get("VAR1")).toBe("value1")
      expect(res.get("VAR3")).toBe("value3-for-env1")
      expect(res.get("VAR4")).toBe("value4-for-env1")
      expect(() => res.get("VAR5" as "VAR1")).toThrow()
      await expect(res.get("VAR6")).resolves.toBe("async-value")
    })

    it("should work for a single–env dynamic resolver (env2 with dynamic data)", () => {
      const res = myVarReg.createDynamicResolver({
        env2: [{ secrets: { VAR4: "value4-for-env2" } }, { myDynamicVar: "dyn" }],
      }, () => "env2")

      expect(res.get("VAR2")).toBe("value2")
      expect(res.get("VAR3")).toBe("value3-for-env2")
      expect(res.get("VAR4")).toBe("value4-for-env2")
      expect(res.get("VAR5")).toBe("dyn")
      // VAR6 only exists in env1 → runtime error when missing definition
      expect(() => res.get("VAR6" as "VAR2")).toThrow()
    })

    it("should default to async if any env resolution is async (env1 | env2)", async () => {
      const flag = true // toggle to choose which env at runtime
      const res = myVarReg.createDynamicResolver({
        env1: [{ env: { VAR4: "value4-for-env1" } }],
        env2: [{ secrets: { VAR4: "value4-for-env2" } }, { myDynamicVar: "dyn" }],
      }, () => (flag ? "env1" : "env2"))

      // VAR3 is sync in both envs
      expect(res.get("VAR3")).toBe(flag ? "value3-for-env1" : "value3-for-env2")

      // VAR6 is async in env1 and may be undefined in env2; union means we always get a Promise
      await expect(res.get("VAR6" as unknown as "VAR3"))
        .resolves.toBe("async-value")

      // VAR7 is sync in env1 and async in env2 → type is Promise and awaiting works
      await expect(res.get("VAR7")).resolves.toBe("v7-sync")
    })
  })
})
