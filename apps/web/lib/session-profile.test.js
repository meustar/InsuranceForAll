import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  PROFILE_IDLE_MS,
  PROFILE_STORAGE_KEY,
  readStoredProfile,
  validateProfileFields,
  writeStoredProfile,
} from "./session-profile.js";

const root = dirname(fileURLToPath(import.meta.url));

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }
}

const valid = {
  birthDate: `${new Date().getUTCFullYear() - 40}-01-01`,
  sex: "여자",
  areaNm: "서울",
};

describe("validateProfileFields", () => {
  it("accepts YYYY-MM-DD, sex, and life area enum", () => {
    assert.equal(validateProfileFields(valid).ok, true);
  });

  it("rejects compact or resident-number shaped dates", () => {
    assert.equal(validateProfileFields({ ...valid, birthDate: "123456" }).ok, false);
    assert.equal(validateProfileFields({ ...valid, birthDate: "12345678" }).ok, false);
  });

  it("rejects occupation-like extra reliance by requiring the three fields only", () => {
    assert.equal(validateProfileFields({ ...valid, sex: "기타" }).ok, false);
    assert.equal(validateProfileFields({ ...valid, areaNm: "해외" }).ok, false);
  });
});

describe("sessionStorage profile", () => {
  it("does not store insurance age", () => {
    const storage = new MemoryStorage();
    const written = writeStoredProfile(storage, valid, 1_000);
    assert.equal(written.ok, true);
    const raw = JSON.parse(storage.getItem(PROFILE_STORAGE_KEY));
    assert.equal("insuranceAge" in raw, false);
    assert.equal("insurance_age" in raw, false);
  });

  it("clears after 30 minutes idle", () => {
    const storage = new MemoryStorage();
    writeStoredProfile(storage, valid, 1_000);
    assert.ok(readStoredProfile(storage, 1_000));
    assert.equal(readStoredProfile(storage, 1_000 + PROFILE_IDLE_MS), null);
    assert.equal(storage.getItem(PROFILE_STORAGE_KEY), null);
  });

  it("returns null when stored JSON is unreadable instead of throwing", () => {
    const storage = new MemoryStorage();
    storage.setItem(PROFILE_STORAGE_KEY, "{");
    assert.equal(readStoredProfile(storage, 1_000), null);
  });
});

describe("profile form submit boundary", () => {
  it("posts to the hub and always preventDefault so birth date stays out of the URL", () => {
    const form = readFileSync(join(root, "../components/ProfileForm.jsx"), "utf8");
    const session = readFileSync(join(root, "../components/SessionProvider.jsx"), "utf8");
    const nextConfig = readFileSync(join(root, "../next.config.mjs"), "utf8");
    assert.match(form, /method="post"/);
    assert.match(form, /action="\/stats"/);
    assert.match(form, /event\.preventDefault\(\)/);
    assert.match(form, /FormData/);
    assert.match(session, /finally/);
    assert.match(session, /setReady\(true\)/);
    assert.match(nextConfig, /allowedDevOrigins/);
    assert.match(nextConfig, /127\.0\.0\.1/);
  });
});
