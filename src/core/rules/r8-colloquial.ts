import { COLLOQUIAL } from "../dict/colloquial.ts";
import { excerptOf, findAll } from "../segment.ts";
import type { Finding, Rule } from "../types.ts";

/** 同じ口語表現が 2 回以上出た場合、2 回目以降を指摘する */
export const r8Colloquial: Rule = (ctx) => {
	const out: Finding[] = [];
	for (const entry of COLLOQUIAL) {
		const hits = findAll(ctx.text, entry.re);
		if (hits.length < 2) continue;
		hits.slice(1).forEach((m, i) => {
			out.push({
				ruleId: "R8",
				severity: "low",
				message: `口語「${entry.label}」が ${i + 2} 回目`,
				range: { start: m.start, end: m.end },
				excerpt: excerptOf(ctx.text, m.start, m.end),
				hint: "口癖は 1 回だけ効く。2 回目は別の言い方にするか削る",
			});
		});
	}
	return out.toSorted((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));
};
