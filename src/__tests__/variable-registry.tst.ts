import { describe, expect, it } from "tstyche"
import { createEnvironmentRegistry } from "../environment-registry"
import { defineType } from "../type-def.js"
import type { VariableRegistry } from "../variable-registry"
import type { Variable } from "../variable"
import type { DefinedResolution } from "../resolution"

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
        data.envData.secrets[data.variableName]),
  )

describe("variable registry", () => {
  it("should define a variable registry with the correct type", () => {
    const subVarReg = envReg.createVariableRegistry()
      .addVar("SUB_VAR1", (v) => v
        .for("env1", "hardcoded", "value1"))
      .addVar("SUB_VAR2", (v) => v
        .for("env2", "hardcoded", "value2"))
      .addVar("SUB_VAR3", (v) => v
        .for("env1", "hardcoded", "value3-for-env1")
        .for("env2", "hardcoded", "value3-for-env2"))
    const varReg = envReg.createVariableRegistry()
      .mergeWith(subVarReg)
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
    expect(varReg).type.toBe<
      VariableRegistry<
        typeof envReg,
        | Variable<
          typeof envReg,
          "VAR1",
          DefinedResolution<
            typeof envReg,
            "env1",
            {
              type: "user-defined"
              tag: "hardcoded"
              payload: string
            }
          >
        >
        | Variable<
          typeof envReg,
          "VAR2",
          DefinedResolution<
            typeof envReg,
            "env2",
            {
              type: "user-defined"
              tag: "hardcoded"
              payload: string
            }
          >
        >
        | Variable<
          typeof envReg,
          "VAR3",
          | DefinedResolution<
            typeof envReg,
            "env1",
            {
              type: "user-defined"
              tag: "hardcoded"
              payload: string
            }
          >
          | DefinedResolution<
            typeof envReg,
            "env2",
            {
              type: "user-defined"
              tag: "hardcoded"
              payload: string
            }
          >
        >
        | Variable<
          typeof envReg,
          "VAR4",
          | DefinedResolution<
            typeof envReg,
            "env1",
            {
              type: "user-defined"
              tag: "from-env"
              payload: string | undefined
            }
          >
          | DefinedResolution<
            typeof envReg,
            "env2",
            {
              type: "user-defined"
              tag: "from-secrets"
              payload: undefined
            }
          >
        >
        | Variable<
          typeof envReg,
          "VAR5",
          DefinedResolution<
            typeof envReg,
            "env2",
            {
              type: "dynamic"
              dynamicName: "myDynamicVar"
            }
          >
        >
        | Variable<
          typeof envReg,
          "VAR6",
          DefinedResolution<
            typeof envReg,
            "env1",
            {
              type: "user-defined"
              tag: "async-res"
              payload: undefined
            }
          >
        >
        | Variable<
          typeof envReg,
          "SUB_VAR1",
          DefinedResolution<
            typeof envReg,
            "env1",
            {
              type: "user-defined"
              tag: "hardcoded"
              payload: string
            }
          >
        >
        | Variable<
          typeof envReg,
          "SUB_VAR2",
          DefinedResolution<
            typeof envReg,
            "env2",
            {
              type: "user-defined"
              tag: "hardcoded"
              payload: string
            }
          >
        >
        | Variable<
          typeof envReg,
          "SUB_VAR3",
          | DefinedResolution<
            typeof envReg,
            "env1",
            {
              type: "user-defined"
              tag: "hardcoded"
              payload: string
            }
          >
          | DefinedResolution<
            typeof envReg,
            "env2",
            {
              type: "user-defined"
              tag: "hardcoded"
              payload: string
            }
          >
        >
      >
    >()
  })

  it("should not be able to create a variable with a duplicate name", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded", "value1"))
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded", "value1")),
    ).type.toRaiseError("Argument of type '\"VAR1\"' is not assignable to parameter of type 'never'.")
  })

  it("should not be able to define a variable for an environment that does not exist", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("invalid", "hardcoded", "value1")),
    ).type.toRaiseError("Argument of type '\"invalid\"' is not assignable to parameter of type '\"env1\" | \"env2\"'.")
  })

  it("should not be able to define a variable for the same environment several times", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded", "value1")
          .for("env1", "hardcoded", "value2")),
    ).type.toRaiseError("Argument of type '\"env1\"' is not assignable to parameter of type '\"env2\"'.")

    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .dynamicFor("env1", "myDynamicVar")
          .dynamicFor("env1", "myDynamicVar")),
    ).type.toRaiseError("Argument of type '\"env1\"' is not assignable to parameter of type '\"env2\"'.")
  })

  it("should not be able to define a variable for a resolution that does not exist", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "invalid", "value1")),
    ).type.toRaiseError("Argument of type '\"invalid\"' is not assignable to parameter of type '\"hardcoded\" | \"from-env\" | \"async-res\"'.")
  })

  it("should be able to omit the payload when it is optional", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "from-env")),
    ).type.not.toRaiseError()
  })

  it("should not be able to omit the payload when it is required", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded")),
    ).type.toRaiseError("Expected 3 arguments, but got 2.")
  })

  it("should be able to define the payload when it is optional", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "from-env", "value1")),
    ).type.not.toRaiseError()
  })

  it("should be able to define the payload when it is required", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded", "value1")),
    ).type.not.toRaiseError()
  })

  it("should be able to define a dynamic variable", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .dynamicFor("env2", "myDynamicVar")),
    ).type.not.toRaiseError()
  })

  it("should not be able to define a variable twice if it comes from a sub registry", () => {
    const subVarReg = envReg.createVariableRegistry()
      .addVar("VAR1", (v) => v
        .for("env1", "hardcoded", "value1"))
    expect(
      envReg.createVariableRegistry()
        .mergeWith(subVarReg)
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded", "value1")),
    ).type.toRaiseError("Argument of type '\"VAR1\"' is not assignable to parameter of type 'never'.")
  })

  it("should not be able to merge a variable registry containing already defined variables", () => {
    const subVarReg = envReg.createVariableRegistry()
      .addVar("VAR1", (v) => v
        .for("env1", "hardcoded", "value1"))
    expect(
      envReg.createVariableRegistry()
        .addVar("VAR1", (v) => v
          .for("env1", "hardcoded", "value1"))
        .mergeWith(subVarReg),
    ).type.toRaiseError(
      /Argument of type '(.*)' is not assignable to parameter of type 'never'./,
    )
  })

  it("should not be able to define variables not in upper case", () => {
    expect(
      envReg.createVariableRegistry()
        .addVar("var1", (v) => v
          .for("env1", "hardcoded", "value1")),
    ).type.toRaiseError("Argument of type 'string' is not assignable to parameter of type 'Uppercase<string>'.")
  })
})

