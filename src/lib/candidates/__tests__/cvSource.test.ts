import { describe, expect, it } from "vitest";
import { cvFileName, cvSourceHref, cvEtag, etagMatches } from "../cvSource";

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

describe("cvEtag", () => {
  it("changes with the file's size or modification time, and is a weak tag", () => {
    expect(cvEtag(1024, 1700000000000)).toMatch(/^W\/"[0-9a-f]+-[0-9a-f]+"$/);
    expect(cvEtag(1024, 1700000000000)).toBe(cvEtag(1024, 1700000000000.4));
    expect(cvEtag(1025, 1700000000000)).not.toBe(cvEtag(1024, 1700000000000));
    expect(cvEtag(1024, 1700000001000)).not.toBe(cvEtag(1024, 1700000000000));
  });
});

describe("etagMatches", () => {
  it("matches the tag in a list, or a wildcard, and nothing when the header is absent", () => {
    const tag = cvEtag(1, 2);
    expect(etagMatches(tag, tag)).toBe(true);
    expect(etagMatches(`"other", ${tag}`, tag)).toBe(true);
    expect(etagMatches("*", tag)).toBe(true);
    expect(etagMatches('"other"', tag)).toBe(false);
    expect(etagMatches(null, tag)).toBe(false);
  });
});
