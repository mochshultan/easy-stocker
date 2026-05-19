// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createAdminAuth } from "../server/services/adminAuth";

describe("admin auth", () => {
  it("accepts the configured admin credential and rejects invalid credentials", () => {
    const auth = createAdminAuth();

    expect(auth.login("admin", "wrong")).toBeNull();

    const session = auth.login("admin", "admin");
    expect(session?.token).toEqual(expect.any(String));
    expect(auth.isValid(session?.token)).toBe(true);
  });
});
