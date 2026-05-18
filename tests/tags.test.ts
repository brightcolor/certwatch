import { describe, expect, it } from "vitest";
import { mergeTags, parseTags } from "../apps/web/src/utils/tags.js";

describe("label parsing", () => {
  it("parses comma and newline separated labels", () => {
    expect(parseTags("prod, mail\nedge")).toEqual(["prod", "mail", "edge"]);
  });

  it("merges pending blur input without duplicates", () => {
    expect(mergeTags(["prod"], "prod, mail")).toEqual(["prod", "mail"]);
  });
});
