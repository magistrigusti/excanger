import { describe, expect, it } from "../setup.js";
import { LokaliseError } from './../../lib/index.js';

describe("LokaliseError", () => {
  describe("Error String Conversion", () => {
    it("should convert errors without code to strings", () => {
      const error = new LokaliseError("Sample error without code");
      expect(String(error)).toEqual("LokaliseError: Sample error without code");
    });

    it("should convert errors with code to strings", () => {
      const error = new LokaliseError("Sample error with code", 404);
      expect(String(error)).toEqual(
        "LokaliseError: Sample error with code (Code: 404)"
      );
    });

    it("should convert errors with code and details to strings", () => {
      const error = new LokaliseError("Sample error with details", 404, {
        reason: "fake",
        info: "extra detail",
      });
      expect(String(error)).toEqual(
        "LokaliseError: Sample error with details (Code: 404) | Details: reason: fake,"
      );
    });
  });

  describe("Error properties", () => {
    it("should expose code and details as properties", () => {
      const error = new LokaliseError("Sample error", 500, {
        reason: "server issue",
      });

      expect(error.message).toEqual("Sample error");
      expect(error.code).toEqual(500);
      expect(error.details).toEqual({ reason: "server issue" });
    });

    it("should handle undefind details gracefully", () => {
      const error = new LokaliseError("Error without details", 400);
      expect(error.details).toBeUndefined();
    });
  });
});