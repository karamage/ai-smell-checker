import { describe, expect, test } from "bun:test";
import { estimateLines, findAll, maskCode, splitParagraphs, splitSentences } from "./segment.ts";

describe("maskCode", () => {
	test("コードブロックを同じ長さの空白にする", () => {
		const src = "前\n```ts\nconst a = 1;\n```\n後";
		const out = maskCode(src);
		expect(out.length).toBe(src.length);
		expect(out.startsWith("前\n")).toBe(true);
		expect(out.endsWith("\n後")).toBe(true);
		expect(out.includes("const")).toBe(false);
	});
	test("インラインコードも消す", () => {
		expect(maskCode("`foo` は大事")).toBe("      は大事");
	});
});

describe("splitParagraphs", () => {
	test("空行で区切り、オフセットを保つ", () => {
		const src = "一つ目。\n\n二つ目。\n続き。\n\n\n三つ目。";
		const ps = splitParagraphs(src);
		expect(ps.map((p) => p.text)).toEqual(["一つ目。", "二つ目。\n続き。", "三つ目。"]);
		for (const p of ps) expect(src.slice(p.start, p.end)).toBe(p.text);
	});
	test("見出し・箇条書き・本文を分類する", () => {
		const ps = splitParagraphs("## 見出し\n\n- a\n- b\n\n本文です。\n\n短い見出しっぽい行");
		expect(ps.map((p) => p.kind)).toEqual(["heading", "list", "prose", "heading"]);
		expect(ps[0]?.headingLevel).toBe(2);
	});
});

describe("splitSentences", () => {
	test("句点で区切る", () => {
		const seg = { text: "これはペンです。あれは本ですか？そうです！", start: 10, end: 32 };
		const ss = splitSentences(seg);
		expect(ss.map((s) => s.text)).toEqual(["これはペンです。", "あれは本ですか？", "そうです！"]);
		expect(ss[1]?.start).toBe(18);
	});
	test("閉じカッコを文に含める", () => {
		const ss = splitSentences({ text: "「行くぞ。」と言った。", start: 0, end: 11 });
		expect(ss.map((s) => s.text)).toEqual(["「行くぞ。」", "と言った。"]);
	});
});

test("estimateLines", () => {
	expect(estimateLines("あ".repeat(40))).toBe(1);
	expect(estimateLines("あ".repeat(41))).toBe(2);
	expect(estimateLines("あ\nい")).toBe(2);
});

test("findAll はオフセット付きで全マッチを返す", () => {
	const r = findAll("ああ正直ねえ正直", /正直/, 100);
	expect(r).toEqual([
		{ text: "正直", start: 102, end: 104 },
		{ text: "正直", start: 106, end: 108 },
	]);
});
