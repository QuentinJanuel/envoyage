/**
 * A class that represents a redacted value.
 *
 * If you wrap a value in this class, it will be redacted when logged,
 * printed, or serialized to JSON.
 *
 * @template T - The type of the value
 * @internal
 */
export class Redacted<T> {
  public constructor(private readonly value: T) {}

  /**
   * Extract the internal value.
   *
   * @returns The internal value
   */
  public getValue() {
    return this.value
  }

  toString() {
    return "<redacted>"
  }

  toJSON() {
    return "<redacted>"
  }

  [Symbol.for("nodejs.util.inspect.custom")]() {
    return "<redacted>"
  }
}
