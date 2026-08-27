import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  BANNED_COPY_SNIPPETS,
  HUB_CARDS,
  PRIVACY_NOTICE_PARAGRAPHS,
  SERVICE_INTRO,
} from "./copy.js";

const root = dirname(fileURLToPath(import.meta.url));

describe("user-facing copy", () => {
  it("does not claim that personal data is not processed", () => {
    const blob = [SERVICE_INTRO, ...PRIVACY_NOTICE_PARAGRAPHS, ...HUB_CARDS.flatMap((card) => [card.message, card.metrics])].join(
      "\n",
    );
    for (const snippet of BANNED_COPY_SNIPPETS) {
      assert.equal(blob.includes(snippet), false, snippet);
    }
  });

  it("keeps privacy notice and hub markup free of banned snippets", () => {
    const files = [
      join(root, "../components/ProfileForm.jsx"),
      join(root, "../components/StatsHub.jsx"),
    ];
    const blob = files.map((path) => readFileSync(path, "utf8")).join("\n");
    for (const snippet of BANNED_COPY_SNIPPETS) {
      assert.equal(blob.includes(snippet), false, snippet);
    }
  });

  it("discloses the anonymous cookie without putting profile values in it", () => {
    const notice = PRIVACY_NOTICE_PARAGRAPHS.join("\n");
    assert.match(notice, /HttpOnly 익명 쿠키/);
    assert.match(notice, /30분 비활성/);
    assert.match(notice, /프로필을 담지 않은/);
    assert.match(notice, /프로필 초기화 시 만료/);
  });

  it("connects profile reset to the same-origin cookie expiry endpoint", () => {
    const provider = readFileSync(join(root, "../components/SessionProvider.jsx"), "utf8");
    const chips = readFileSync(join(root, "../components/SessionChips.jsx"), "utf8");
    assert.match(provider, /fetch\("\/api\/v1\/session"/);
    assert.match(provider, /method: "DELETE"/);
    assert.match(provider, /credentials: "include"/);
    assert.match(chips, /프로필 초기화/);
    assert.match(chips, /clear\(\)/);
  });
});
