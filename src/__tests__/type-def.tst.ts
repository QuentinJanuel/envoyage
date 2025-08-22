import { describe, it, expect } from "tstyche"
import type { TypeDef, Infer } from "../type-def.js"
import { defineType } from "../type-def.js"

describe("defineType", () => {
  it("should define a type", () => {
    expect(defineType<string>()).type.toBe<TypeDef<string>>()
    expect(defineType<number>()).type.toBe<TypeDef<number>>()
    expect(defineType<boolean>()).type.toBe<TypeDef<boolean>>()
  })

  it("should infer the type from a type definition", () => {
    expect<Infer<TypeDef<string>>>().type.toBe<string>()
    expect<Infer<TypeDef<number>>>().type.toBe<number>()
    expect<Infer<TypeDef<boolean>>>().type.toBe<boolean>()
  })

  it("should fail to infer something that is not a type definition", () => {
    expect<Infer<string>>().type
      .toRaiseError("Type 'string' has no properties in common with type 'TypeDef<any>'.")
  })
})
