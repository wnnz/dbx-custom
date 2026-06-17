import { describe, expect, it } from "vitest";
import { shouldRenderTrimmedSelectionLineRange } from "../codemirrorTrimmedSelectionLayer";

describe("trimmed CodeMirror selection layer", () => {
  it("does not render a line-end zero-width range on a non-empty line", () => {
    expect(shouldRenderTrimmedSelectionLineRange(42, 42, 30, 42, 42)).toBe(false);
  });

  it("renders selected text and selected empty lines", () => {
    expect(shouldRenderTrimmedSelectionLineRange(38, 42, 30, 42, 42)).toBe(true);
    expect(shouldRenderTrimmedSelectionLineRange(42, 42, 42, 42, 43)).toBe(true);
  });
});
