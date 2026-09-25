import { describe, expect, it } from "vitest";
import { cvFileName, cvSourceHref } from "../cvSource";

describe("cvFileName", () => {
  it("names the download name_surname_cv.pdf", () => {
    expect(cvFileName("daan-de-vries")).toBe("daan_de_vries_cv.pdf");
  });
});

describe("cvSourceHref", () => {
  it("links to the CV route at the cited page", () => {
    expect(cvSourceHref("lena-novak", 2)).toBe("/api/cvs/lena-novak#page=2");
  });

  it("returns undefined for an invalid id or page", () => {
    expect(cvSourceHref("../secret", 1)).toBeUndefined();
    expect(cvSourceHref("Lena Novak", 1)).toBeUndefined();
    expect(cvSourceHref("lena-novak", 0)).toBeUndefined();
    expect(cvSourceHref("lena-novak", 1.5)).toBeUndefined();
  });
});
