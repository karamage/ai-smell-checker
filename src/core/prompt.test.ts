import { describe, expect, test } from "bun:test";
import { analyze } from "./index.ts";
import { buildPrompt } from "./prompt.ts";
import { SAMPLE_AI } from "./samples.ts";

describe("buildPrompt", () => {
	test("指摘のあったルールだけを載せ、本文を末尾に含める", () => {
		const report = analyze(SAMPLE_AI);
		const p = buildPrompt(SAMPLE_AI, report);
		expect(p).toContain(`臭気指数 ${report.score} / 100`);
		expect(p).toContain("### 禁止ワード（");
		expect(p).toContain("「いかがでしたか」");
		expect(p).not.toContain("### 主語なし");
		expect(p.trimEnd().endsWith('"""')).toBe(true);
		expect(p).toContain(SAMPLE_AI.trim());
		expect(p).toContain("です・ます調");
	});
	test("指摘ゼロなら「指摘はありません」", () => {
		const clean =
			"昨日は雨だった。今日は晴れている。明日のことは分からない。傘を持っていくか迷ったが、結局は置いていった。駅までの道で少し濡れた。それだけの話だ。帰りに買ったコーヒーは苦かった。次は別の店にする。";
		const p = buildPrompt(clean, analyze(clean));
		expect(p).toContain("指摘はありません");
		expect(p).not.toContain("###");
		expect(p).toContain("だ・である調");
	});
	test("該当箇所は重複を除き 8 件で打ち切る", () => {
		const text = `${"いかがでしたか。".repeat(3)}${"まとめると、".repeat(2)}様々な。非常に重要。総じて。結論として。参考になれば幸いです。一助となれば。押さえておきましょう。`;
		const p = buildPrompt(text, analyze(text));
		const line = p.split("\n").find((l) => l.startsWith("該当箇所:")) ?? "";
		expect((line.match(/「/g) ?? []).length).toBe(8);
		expect(line).toContain("ほか");
		expect(line.indexOf("いかがでしたか")).toBe(line.lastIndexOf("いかがでしたか"));
	});
	test("短すぎる本文でも組み立てられる", () => {
		const p = buildPrompt("短い。", analyze("短い。"));
		expect(p).toContain("本文が短いため");
	});
});
