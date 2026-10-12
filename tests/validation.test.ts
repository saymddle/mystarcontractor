import { describe, expect, it } from "vitest";
import {
  ALLOWED_DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES,
  MAX_PHOTO_BYTES,
  ensureSafeText,
  validateMilestone,
  validateUploadFile
} from "@/lib/validation";

const MB = 1024 * 1024;

describe("ensureSafeText", () => {
  it("accepts text within the limit", () => {
    expect(() => ensureSafeText("Permit set", 120, "Title")).not.toThrow();
  });

  it("rejects empty text, naming the field", () => {
    expect(() => ensureSafeText("", 120, "Document title")).toThrow(
      "Document title is required."
    );
  });

  it("accepts text exactly at the limit", () => {
    expect(() => ensureSafeText("x".repeat(120), 120, "Title")).not.toThrow();
  });

  it("rejects text one character over the limit", () => {
    expect(() => ensureSafeText("x".repeat(121), 120, "Title")).toThrow(
      "Title must be 120 characters or fewer."
    );
  });
});

describe("validateUploadFile", () => {
  describe("documents", () => {
    it("accepts a PDF under the size cap", () => {
      expect(() =>
        validateUploadFile({ size: 2 * MB, type: "application/pdf" }, "documents")
      ).not.toThrow();
    });

    it("accepts a file exactly at the cap", () => {
      expect(() =>
        validateUploadFile(
          { size: MAX_DOCUMENT_BYTES, type: "application/pdf" },
          "documents"
        )
      ).not.toThrow();
    });

    it("rejects a file one byte over the cap", () => {
      expect(() =>
        validateUploadFile(
          { size: MAX_DOCUMENT_BYTES + 1, type: "application/pdf" },
          "documents"
        )
      ).toThrow("Documents must be 25 MB or smaller.");
    });

    it("rejects an unsupported type", () => {
      expect(() =>
        validateUploadFile({ size: 1024, type: "application/zip" }, "documents")
      ).toThrow(/not supported/);
    });

    it("allows a blank type, which browsers send for some files", () => {
      expect(() =>
        validateUploadFile({ size: 1024, type: "" }, "documents")
      ).not.toThrow();
    });

    it("accepts every type on the allow list", () => {
      for (const type of ALLOWED_DOCUMENT_TYPES) {
        expect(() =>
          validateUploadFile({ size: 1024, type }, "documents")
        ).not.toThrow();
      }
    });
  });

  describe("photos", () => {
    it("accepts a JPEG under the cap", () => {
      expect(() =>
        validateUploadFile({ size: 3 * MB, type: "image/jpeg" }, "photos")
      ).not.toThrow();
    });

    it("rejects a photo over the cap", () => {
      expect(() =>
        validateUploadFile(
          { size: MAX_PHOTO_BYTES + 1, type: "image/jpeg" },
          "photos"
        )
      ).toThrow("Photos must be 15 MB or smaller.");
    });

    it("rejects a PDF uploaded as a photo", () => {
      expect(() =>
        validateUploadFile({ size: 1024, type: "application/pdf" }, "photos")
      ).toThrow(/not supported/);
    });

    it("applies the photo cap, not the document cap", () => {
      // 20 MB is fine for a document and too large for a photo. A shared cap
      // would let this through.
      expect(() =>
        validateUploadFile({ size: 20 * MB, type: "image/jpeg" }, "photos")
      ).toThrow("Photos must be 15 MB or smaller.");
    });
  });
});

describe("validateMilestone", () => {
  it("accepts a titled milestone at a sane percentage", () => {
    expect(validateMilestone("Framing", 70)).toEqual({});
  });

  it("accepts both ends of the percentage range", () => {
    expect(validateMilestone("Framing", 0)).toEqual({});
    expect(validateMilestone("Framing", 100)).toEqual({});
  });

  it("requires a title", () => {
    expect(validateMilestone("", 0)).toHaveProperty("title");
  });

  it("rejects a percentage above 100", () => {
    expect(validateMilestone("Framing", 101)).toHaveProperty("percentComplete");
  });

  it("rejects a negative percentage", () => {
    expect(validateMilestone("Framing", -1)).toHaveProperty("percentComplete");
  });

  it("rejects a non-numeric percentage", () => {
    // Number("") is 0, but Number("abc") is NaN, which would otherwise pass
    // straight through the comparison operators into the database.
    expect(validateMilestone("Framing", Number("abc"))).toHaveProperty(
      "percentComplete"
    );
  });

  it("reports every problem at once rather than one at a time", () => {
    expect(Object.keys(validateMilestone("", 150)).sort()).toEqual([
      "percentComplete",
      "title"
    ]);
  });
});
