import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function read(relative) {
  return readFileSync(join(root, relative), "utf8");
}

describe("ops surface", () => {
  it("keeps ops calls on same-origin cookies and off analytics", () => {
    const ops = read("./ops.js");
    assert.match(ops, /credentials: "include"/);
    assert.match(ops, /\/api\/v1\/ops\/session/);
    assert.match(ops, /\/api\/v1\/ops\/dashboard/);
    assert.equal(ops.includes("gtag("), false);
    assert.equal(ops.includes("birthDate"), false);
    assert.equal(ops.includes("NEXT_PUBLIC_"), false);
  });

  it("does not put sign-in on the user header or link users to /ops", () => {
    const header = read("../components/AppHeader.jsx");
    const home = read("../app/page.js");
    assert.equal(header.includes("Sign In"), false);
    assert.equal(header.includes("로그인"), false);
    assert.equal(header.includes("/ops"), false);
    assert.equal(home.includes("/ops"), false);
    assert.equal(home.includes("Sign In"), false);
  });

  it("isolates ops chrome from user stats tabs and session chips", () => {
    const shell = read("../components/AppShell.jsx");
    const chrome = read("../components/ops/OpsChrome.jsx");
    const layout = read("../app/layout.js");
    assert.match(shell, /pathname\.startsWith\("\/ops\/"\)/);
    assert.match(chrome, /로그아웃/);
    assert.equal(chrome.includes("실손"), false);
    assert.equal(layout.includes("gtag"), false);
    assert.equal(layout.includes("G-"), false);
  });
});
