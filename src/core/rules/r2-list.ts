import { excerptOf } from "../segment.ts";
import type { Finding, Rule } from "../types.ts";

const ITEM_RE = /^\s*(?:[-*+・•●○■□▪]|\d+[.．)）]|[①-⑳])\s*\S/;
const THRESHOLD = 3;

/** 箇条書きの項目が 3 行以上連続するブロックを指摘する */
export const r2List: Rule = (ctx) => {
	const out: Finding[] = [];
	const lines = ctx.text.split("\n");
	let offset = 0;
	let runStart = -1;
	let runEnd = -1;
	let count = 0;

	const flush = () => {
		if (count >= THRESHOLD && runStart >= 0) {
			out.push({
				ruleId: "R2",
				severity: "mid",
				message: `箇条書きが ${count} 項目連続`,
				range: { start: runStart, end: runEnd },
				excerpt: excerptOf(ctx.text, runStart, Math.min(runEnd, runStart + 60), 0),
				hint: "3 項目を超える列挙は本文に戻す。重要な 1〜2 個に絞るか、段落で理由ごと書く",
			});
		}
		count = 0;
		runStart = -1;
		runEnd = -1;
	};

	for (const line of lines) {
		if (ITEM_RE.test(line)) {
			if (count === 0) runStart = offset + (line.length - line.trimStart().length);
			count++;
			runEnd = offset + line.trimEnd().length;
		} else if (line.trim() !== "") {
			flush();
		}
		offset += line.length + 1;
	}
	flush();
	return out;
};
