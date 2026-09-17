import { excerptOf, splitSentences } from "../segment.ts";
import type { Finding, Rule } from "../types.ts";

const LEAD_START_RE =
	/^(ここでは|この(章|節|セクション|項|記事)では|本(章|節|記事|稿)では|以下では|まずは?、?)/;
const LEAD_TOPIC_RE = /^.{0,14}?(とは|について|に関して)(、|は|$)/;
const LEAD_END_RE =
	/((ご)?(説明|解説|紹介|概説)(し|いたし)(ます|ていきます)|見ていき(ましょう|ます)|述べ(ます|ていきます)|触れ(ます|ていきます)|まとめ(ます|ていきます)|整理し(ます|ていきます)|確認し(ましょう|ていきましょう)|考えてみましょう|のことです|を指します|と呼ばれ(ます|ています)|と呼びます|として知られています|の(一|ひと)つです)[。！!]?$/;

/** 見出し直後の最初の文が「説明」から始まっている箇所を指摘する */
export const r9HeadingLead: Rule = (ctx) => {
	const out: Finding[] = [];
	const ps = ctx.paragraphs;
	for (let i = 0; i < ps.length; i++) {
		const h = ps[i];
		if (h?.kind !== "heading") continue;
		const next = ps[i + 1];
		if (next?.kind !== "prose") continue;
		const first = splitSentences(next)[0];
		if (!first) continue;
		const core = first.text.replace(/[。！？!?]+$/u, "");
		const isLead = LEAD_START_RE.test(core) || LEAD_TOPIC_RE.test(core) || LEAD_END_RE.test(core);
		if (!isLead) continue;
		out.push({
			ruleId: "R9",
			severity: "mid",
			message: `見出し「${h.text.replace(/^#+\s*/, "")}」の直後が説明から始まる`,
			range: { start: first.start, end: first.end },
			excerpt: excerptOf(ctx.text, first.start, first.end, 0),
			hint: "見出しの直後は結論か具体例を置く。「AとはBのことです」型の定義は 2 文目以降へ",
		});
	}
	return out;
};
