import { excerptOf } from "../segment.ts";
import type { Finding, Rule } from "../types.ts";

const HEAD_RE = /^(まずは|まず|次に|最後に|続いて|第一に|第二に|第三に)/;

/** 段落の書き出しが順序接続詞になっている箇所を指摘する */
export const r5Sequence: Rule = (ctx) => {
	const out: Finding[] = [];
	for (const p of ctx.paragraphs) {
		if (p.kind !== "prose") continue;
		const m = HEAD_RE.exec(p.text);
		if (!m) continue;
		const word = m[0];
		out.push({
			ruleId: "R5",
			severity: "mid",
			message: `段落が「${word}」で始まる`,
			range: { start: p.start, end: p.start + word.length },
			excerpt: excerptOf(ctx.text, p.start, p.start + word.length, 20),
			hint: "手順の番号を段落頭に貼らない。内容そのものから書き始めると順序は自然に伝わる",
		});
	}
	return out;
};
