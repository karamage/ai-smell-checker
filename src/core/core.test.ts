import { describe, expect, test } from "bun:test";
import { analyze, decodeShare, encodeShare, levelOf, scoreOf } from "./index.ts";
import { SAMPLE_AI, SAMPLE_HUMAN } from "./samples.ts";

describe("scoreOf / levelOf", () => {
	test("空なら 0 で無臭", () => {
		expect(scoreOf([])).toBe(0);
		expect(levelOf(0).label).toBe("無臭");
	});
	test("ルールごとに上限で頭打ちになる", () => {
		const many = Array.from({ length: 20 }, () => ({
			ruleId: "R8" as const,
			severity: "low" as const,
			message: "",
			range: null,
			excerpt: "",
			hint: "",
		}));
		expect(scoreOf(many)).toBe(9);
	});
	test("境界値", () => {
		expect(levelOf(14).index).toBe(0);
		expect(levelOf(15).index).toBe(1);
		expect(levelOf(35).index).toBe(2);
		expect(levelOf(55).index).toBe(3);
		expect(levelOf(75).index).toBe(4);
		expect(levelOf(100).index).toBe(4);
	});
});

describe("analyze", () => {
	test("AI サンプルは激臭、人間サンプルは微臭以下", () => {
		const ai = analyze(SAMPLE_AI);
		const human = analyze(SAMPLE_HUMAN);
		expect(ai.score).toBeGreaterThanOrEqual(75);
		expect(human.score).toBeLessThan(35);
		expect(ai.score).toBeGreaterThan(human.score + 40);
	});
	test("短すぎる文章は指数を出さない", () => {
		const r = analyze("短い。");
		expect(r.tooShort).toBe(true);
		expect(r.score).toBe(0);
		expect(r.skipped).toEqual(["R4", "R6", "R7"]);
	});
	test("指摘はオフセット順に並び、範囲なしは末尾", () => {
		const r = analyze(SAMPLE_AI);
		const ranged = r.findings.filter((f) => f.range);
		for (let i = 1; i < ranged.length; i++) {
			expect((ranged[i]?.range?.start ?? 0) >= (ranged[i - 1]?.range?.start ?? 0)).toBe(true);
		}
		const firstNull = r.findings.findIndex((f) => !f.range);
		if (firstNull >= 0) expect(r.findings.slice(firstNull).every((f) => !f.range)).toBe(true);
	});
	test("counts と passed が整合する", () => {
		const r = analyze(SAMPLE_HUMAN);
		const total = Object.values(r.counts).reduce((a, b) => a + b, 0);
		expect(total).toBe(r.findings.length);
		for (const id of r.passed) expect(r.counts[id]).toBe(0);
	});
});

describe("share code", () => {
	test("往復できる", () => {
		const r = analyze(SAMPLE_AI);
		const code = encodeShare(r);
		expect(code.length).toBeLessThanOrEqual(8);
		const d = decodeShare(code);
		expect(d?.score).toBe(r.score);
		expect(d?.count).toBe(Math.min(255, r.findings.length));
		expect(d?.rules).toEqual(
			r.findings.length ? [...new Set(r.findings.map((f) => f.ruleId))].toSorted() : [],
		);
	});
	test("壊れたコードは null", () => {
		expect(decodeShare("zzz")).toBeNull();
		expect(decodeShare("AAAAAAA")).toBeNull();
		expect(decodeShare("../x")).toBeNull();
		const code = encodeShare(analyze(SAMPLE_AI));
		const tampered = `${code.slice(0, -1)}${code.endsWith("A") ? "B" : "A"}`;
		expect(decodeShare(tampered)).toBeNull();
	});
});
