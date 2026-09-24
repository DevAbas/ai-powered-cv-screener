import { describe, expect, it } from "vitest";
import { cvFileName, cvSourceHref } from "./source-href";

describe("cvFileName", () => {
  it("names the file name_surname_cv.pdf", () => {
    expect(cvFileName("daan-de-vries")).toBe("daan_de_vries_cv.pdf");
  });
});

describe("cvSourceHref", () => {
  it("links to the PDF at the cited page", () => {
    expect(cvSourceHref("lena-novak", 2)).toBe("/cvs/lena_novak_cv.pdf#page=2");
  });

  it("returns undefined for an invalid id or page", () => {
    expect(cvSourceHref("../secret", 1)).toBeUndefined();
    expect(cvSourceHref("Lena Novak", 1)).toBeUndefined();
    expect(cvSourceHref("lena-novak", 0)).toBeUndefined();
    expect(cvSourceHref("lena-novak", 1.5)).toBeUndefined();
  });
});
