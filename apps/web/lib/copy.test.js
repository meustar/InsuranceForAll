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
});
