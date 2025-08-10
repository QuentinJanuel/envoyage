import { describe, expect, it } from "vitest"
import { Redacted } from "../redacted.js"

describe("Redacted", () => {
  describe("create", () => {
    it("should create a redacted value", () => {
      const value = "secret"
      const redacted = new Redacted(value)
      expect(redacted).toBeInstanceOf(Redacted)
      expect(redacted.getValue()).toBe(value)
    })

    it("should work with different types", () => {
      const stringValue = new Redacted("secret")
      const numberValue = new Redacted(42)
      const objectValue = new Redacted({ key: "value" })
      const arrayValue = new Redacted([1, 2, 3])

      expect(stringValue.getValue()).toBe("secret")
      expect(numberValue.getValue()).toBe(42)
      expect(objectValue.getValue()).toEqual({ key: "value" })
      expect(arrayValue.getValue()).toEqual([1, 2, 3])
    })
  })

  describe("getValue", () => {
    it("should return the original value", () => {
      const value = { sensitive: "data" }
      const redacted = new Redacted(value)
      expect(redacted.getValue()).toBe(value)
    })
  })

  describe("toString", () => {
    it("should return redacted string", () => {
      const redacted = new Redacted("secret")
      expect(redacted.toString()).toBe("<redacted>")
      expect(String(redacted)).toBe("<redacted>")
    })
  })

  describe("toJSON", () => {
    it("should return redacted string", () => {
      const redacted = new Redacted("secret")
      expect(redacted.toJSON()).toBe("<redacted>")
      expect(JSON.stringify(redacted)).toBe('"<redacted>"')
    })

    it("should redact when nested in objects", () => {
      const obj = {
        visible: "public",
        hidden: new Redacted("secret"),
        nested: {
          alsoHidden: new Redacted(123),
        },
      }
      expect(JSON.stringify(obj)).toBe(
        '{"visible":"public","hidden":"<redacted>","nested":{"alsoHidden":"<redacted>"}}',
      )
    })
  })

  describe("inspect", () => {
    it("should return redacted string when using util.inspect", () => {
      const redacted = new Redacted("secret")
      const inspectResult = (redacted as unknown as { [key: symbol]: () => string })[Symbol.for("nodejs.util.inspect.custom")]()
      expect(inspectResult).toBe("<redacted>")
    })
  })
})
