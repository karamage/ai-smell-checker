import { BANNED } from "../dict/banned.ts";
import { excerptOf, findAll } from "../segment.ts";
import type { Finding, Rule } from "../types.ts";

export const r0Banned: Rule = (ctx) => {
	const out: Finding[] = [];
	for (const entry of BANNED) {
		const re =
			typeof entry.pattern === "string" ? new RegExp(escapeRegExp(entry.pattern)) : entry.pattern;
		for (const m of findAll(ctx.text, re)) {
			out.push({
				ruleId: "R0",
				severity: entry.severity,
				message: `禁止ワード「${m.text}」`,
				range: { start: m.start, end: m.end },
				excerpt: excerptOf(ctx.text, m.start, m.end),
				hint: entry.hint,
			});
		}
	}
	return out.toSorted((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));
};

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
