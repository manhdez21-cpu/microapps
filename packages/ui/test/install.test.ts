import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectPlatform } from "../src/install.ts";

describe("detectPlatform", () => {
  it("reconoce iPhone, iPad moderno y Android", () => {
    assert.equal(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), "ios");
    assert.equal(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), "ios");
    assert.equal(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), "other");
    assert.equal(detectPlatform("Mozilla/5.0 (Linux; Android 14; Pixel 8)"), "android");
    assert.equal(detectPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"), "other");
  });
});
