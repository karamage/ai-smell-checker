import { excerptOf, findAll } from "../segment.ts";
import type { Finding, Rule } from "../types.ts";

const PATTERNS: { re: RegExp; hint: string }[] = [
	{
		re: /(と|とも)?(言|い)える(でしょう|だろう|かもしれません)/,
		hint: "「〜と言えるでしょう」は結論を先回りする型。「〜だ」と言い切るか、迷いを残すなら理由を書く",
	},
	{
		re: /(の)?ではない(でしょうか|だろうか)/,
		hint: "「〜ではないでしょうか」は意見の無い逃げ。自分の判断を書く",
	},
	{
		re: /ということになる(でしょう|だろう)/,
		hint: "推論の結果は言い切る",
	},
];

export const r3Hedge: Rule = (ctx) => {
	const out: Finding[] = [];
	for (const p of PATTERNS) {
		for (const m of findAll(ctx.text, p.re)) {
			out.push({
				ruleId: "R3",
				severity: "high",
				message: `逃げの断定「${m.text}」`,
				range: { start: m.start, end: m.end },
				excerpt: excerptOf(ctx.text, m.start, m.end),
				hint: p.hint,
			});
		}
	}
	return out.toSorted((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));
};
