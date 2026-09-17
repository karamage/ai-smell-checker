import { estimateLines } from "../segment.ts";
import type { Finding, Rule } from "../types.ts";

const MIN_PARAGRAPHS = 3;
const CV_THRESHOLD = 0.35;

/**
 * 本文段落の推定行数（40 字＝1 行）のバラつきを見る。
 * 変動係数が小さい、または 1 行段落が無い場合に指摘する。
 */
export const r4ParagraphVariance: Rule = (ctx) => {
	const prose = ctx.paragraphs.filter((p) => p.kind === "prose");
	if (prose.length < MIN_PARAGRAPHS) return [];
	const lines = prose.map((p) => estimateLines(p.text));
	const mean = lines.reduce((a, b) => a + b, 0) / lines.length;
	const variance = lines.reduce((a, b) => a + (b - mean) ** 2, 0) / lines.length;
	const cv = mean === 0 ? 0 : Math.sqrt(variance) / mean;
	const hasShort = lines.some((n) => n <= 1);
	const hasLong = lines.some((n) => n >= 3);

	const findings: Finding[] = [];
	if (cv < CV_THRESHOLD || !hasShort || !hasLong) {
		const reason = !hasShort
			? "1 行で言い切る短い段落が 1 つもない"
			: !hasLong
				? "3 行以上の厚い段落が 1 つもない"
				: "どの段落もほぼ同じ長さ";
		findings.push({
			ruleId: "R4",
			severity: "mid",
			message: `段落の長さが均一（推定行数 ${lines.join(", ")}）。${reason}`,
			range: null,
			excerpt: "",
			hint: "深く語る段落と一言で済ませる段落を混ぜる。大事な一文は独立させ、説明は厚く書く",
		});
	}
	return findings;
};
