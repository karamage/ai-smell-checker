import { excerptOf, splitSentences } from "../segment.ts";
import type { Finding, Rule, Segment } from "../types.ts";

const THRESHOLD = 3;

function endingOf(sentence: string): "です" | "ます" | null {
	const core = sentence.replace(/[。！？!?」』）)\s]+$/u, "");
	if (core.endsWith("です")) return "です";
	if (core.endsWith("ます")) return "ます";
	return null;
}

/** 同じ文末（です／ます）が 3 文以上続いた区間を指摘する */
export const r1DesuMasu: Rule = (ctx) => {
	const out: Finding[] = [];
	let run: Segment[] = [];
	let current: "です" | "ます" | null = null;

	const flush = () => {
		if (current && run.length >= THRESHOLD) {
			const first = run[0];
			const last = run[run.length - 1];
			if (first && last) {
				out.push({
					ruleId: "R1",
					severity: "mid",
					message: `「${current}」で終わる文が ${run.length} 連続`,
					range: { start: first.start, end: last.end },
					excerpt: excerptOf(ctx.text, first.start, last.end, 0),
					hint: "文末を散らす。体言止め、「〜だ」「〜した」、問いかけを混ぜるか、2 文を 1 文にまとめる",
				});
			}
		}
		run = [];
		current = null;
	};

	// 見出しや箇条書きを挟んだら連続とはみなさない
	for (const p of ctx.paragraphs) {
		if (p.kind !== "prose") {
			flush();
			continue;
		}
		for (const s of splitSentences(p)) {
			const e = endingOf(s.text);
			if (e && e === current) {
				run.push(s);
			} else {
				flush();
				if (e) {
					current = e;
					run = [s];
				}
			}
		}
	}
	flush();
	return out;
};
