import { LokaliseError } from "../../../lib/errors/LokaliseError.js";
import { describe, expect, it } from "../setup.js";

describe("LokaliseError", () => {
  it("should expose code and details", () => {
    const message = "Sample error";
    const code = 500;
    const details = { reason: "server issue" }

    const error = new LokaliseError(message, code, details);

    expect(error.message).toEqual(message);
    expect(error.code).toEqual(code);
    expect(error.details).toEqual(details);
  });
});