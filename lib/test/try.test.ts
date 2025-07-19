import { describe, expect, it } from "./setup.js";
import { LokaliseFileExchange } from "../services/LokaliseFileExchange.js";

describe("LokaliseFileExchange", () => {
  it("should create an instance", () => {
    const exchange = new LokaliseFileExchange({ projectId: "123.abc" });

    expect(exchange).toBeInstanceOf(LokaliseFileExchange);
  });

  it("should throw an error if the project ID is missing", () => {
    expect(() =>{
      new LokaliseFileExchange({ projectId: "" });
    }).toThrow("Invalid or missing project ID");
  });
});