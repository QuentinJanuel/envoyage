import { describe, it, expect } from "tstyche"
import type { Extends, HasIntersection, KeepIf, Not, OptionalIf, RemoveLiteral } from "../utils.js"

describe("KeepIf", () => {
  it("should return the type if the condition is true", () => {
    expect<KeepIf<"a", true>>().type.toBe<"a">()
  })

  it("should return never if the condition is false", () => {
    expect<KeepIf<"a", false>>().type.toBe<never>()
  })

  it("should fail if the condition is not a boolean", () => {
    expect<KeepIf<"a", "a">>().type
      .toRaiseError("Type 'string' does not satisfy the constraint 'boolean'.")
  })
})

describe("Extends", () => {
  it("should return true if the type extends the other type", () => {
    expect<Extends<"a", "a" | "b">>().type.toBe<true>()
  })

  it("should return false if the type does not extend the other type", () => {
    expect<Extends<"a", "b">>().type.toBe<false>()
  })
})

describe("OptionalIf", () => {
  it("should return an optional type if the condition is true", () => {
    expect<OptionalIf<"a", true>>().type.toBe<[a?: "a"]>()
  })

  it("should return a non-optional type if the condition is false", () => {
    expect<OptionalIf<"a", false>>().type.toBe<["a"]>()
  })

  it("should fail if the condition is not a boolean", () => {
    expect<OptionalIf<"a", "a">>().type.toRaiseError("Type 'string' does not satisfy the constraint 'boolean'.")
  })
})

describe("Not", () => {
  it("should return true if the type is false", () => {
    expect<Not<false>>().type.toBe<true>()
  })

  it("should return false if the type is true", () => {
    expect<Not<true>>().type.toBe<false>()
  })

  it("should fail if the type is not a boolean", () => {
    expect<Not<"a">>().type.toRaiseError("Type 'string' does not satisfy the constraint 'boolean'.")
  })
})

describe("RemoveLiteral", () => {
  it("should remove a literal from a type", () => {
    expect<RemoveLiteral<"a" | "b" | "c", "a">>().type.toBe<"b" | "c">()
    expect<RemoveLiteral<"a" | "b" | "c", "b" | "c">>().type.toBe<"a">()
  })

  it("should handle generic type parameters and exclude specific literals", () => {
    expect<RemoveLiteral<string, "a">>().type.toBe<string>()
    const f = <S extends string>(notA: RemoveLiteral<S, "a">) => notA
    expect(f).type.not.toBeCallableWith("a")
    expect(f).type.toBeCallableWith("b")
    expect(f).type.toBeCallableWith("c")
  })
})

describe("HasIntersection", () => {
  it("should return true if the types have an intersection", () => {
    expect<HasIntersection<"a" | "b", "b">>().type.toBe<true>()
    expect<HasIntersection<"a", "a" | "b">>().type.toBe<true>()
    expect<HasIntersection<"a", string>>().type.toBe<true>()
  })

  it("should return false if the types do not have an intersection", () => {
    expect<HasIntersection<"a", "b">>().type.toBe<false>()
    expect<HasIntersection<"a" | "b", "c" | "d">>().type.toBe<false>()
    expect<HasIntersection<string, number>>().type.toBe<false>()
  })
})
