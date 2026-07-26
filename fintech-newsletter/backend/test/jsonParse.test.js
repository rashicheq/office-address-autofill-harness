import { test } from "node:test";
import assert from "node:assert/strict";
import { parseJsonArrayLoose, parseJsonObjectLoose } from "../src/lib/jsonParse.js";

test("parseJsonArrayLoose: plain valid array", () => {
  const result = parseJsonArrayLoose('[{"title":"a"},{"title":"b"}]');
  assert.deepEqual(result, [{ title: "a" }, { title: "b" }]);
});

test("parseJsonArrayLoose: markdown-fenced array with surrounding prose", () => {
  const text = 'Sure, here you go:\n```json\n[{"title":"a"}]\n```\nLet me know if you need more.';
  assert.deepEqual(parseJsonArrayLoose(text), [{ title: "a" }]);
});

test("parseJsonArrayLoose: empty array", () => {
  assert.deepEqual(parseJsonArrayLoose("[]"), []);
});

test("parseJsonArrayLoose: repairs a response truncated mid-second-object", () => {
  const truncated = '[{"title":"a","link":"https://x"},{"title":"b","link":"https://tr';
  assert.deepEqual(parseJsonArrayLoose(truncated), [{ title: "a", link: "https://x" }]);
});

test("parseJsonArrayLoose: throws on genuinely unparseable text", () => {
  assert.throws(() => parseJsonArrayLoose("Sorry, I couldn't find anything."));
});

test("parseJsonObjectLoose: plain valid object", () => {
  assert.deepEqual(parseJsonObjectLoose('{"linkedin_angle":"x","reflection_questions":["y"]}'), {
    linkedin_angle: "x",
    reflection_questions: ["y"],
  });
});

test("parseJsonObjectLoose: markdown-fenced object", () => {
  const text = '```json\n{"month_theme":"travel"}\n```';
  assert.deepEqual(parseJsonObjectLoose(text), { month_theme: "travel" });
});

test("parseJsonObjectLoose: throws on unparseable text", () => {
  assert.throws(() => parseJsonObjectLoose("no json here"));
});
