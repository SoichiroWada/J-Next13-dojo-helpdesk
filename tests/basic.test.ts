import { describe, it, expect } from "vitest";

describe("Basic tests", () => {
  it("should add two numbers", () => {
    expect(1 + 2).toBe(3);
  });

  it("should verify application name", () => {
    expect("Dojo Helpdesk").toContain("Helpdesk");
  });
});
