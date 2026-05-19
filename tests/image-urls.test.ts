import { describe, expect, it } from "vitest";
import { thumbnailUrl } from "../src/lib/imageUrls";

describe("image URL helpers", () => {
  it("builds a thumbnail API URL without mutating the original source path", () => {
    const url = thumbnailUrl("/source-images/WIN_20260515_10_57_26_Pro.jpg", 160);

    expect(url).toContain("/api/images/thumb?");
    expect(url).toContain("w=160");
    expect(decodeURIComponent(url)).toContain("/source-images/WIN_20260515_10_57_26_Pro.jpg");
  });
});
