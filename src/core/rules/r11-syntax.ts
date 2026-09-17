import { excerptOf, findAll, splitSentences } from "../segment.ts";
import type { Finding, Rule, Segment } from "../types.ts";

/** 文頭の接続詞。3 文連続で接続詞から始まると「一方で〜。しかし〜。だから〜」型 */
const CONJ_LEAD_RE =
	/^(一方で|一方、|しかし|だが|ただし|ただ、|だから|そのため|したがって|ゆえに|なので|また、|そして|つまり|さらに|加えて|とはいえ|もちろん|むしろ)/;

interface Pattern {
	re: RegExp;
	label: string;
	severity: Finding["severity"];
	hint: string;
}

/** 1 文の中で完結する構文。文単位で照合する */
const SENTENCE_PATTERNS: Pattern[] = [
	{
		re: /(単なる|ただの)[^。]*?ではなく、?[^。]*?(なのです|なのだ|なんです|です|である|だ)$/,
		label: "単なるAではなく、Bなのです",
		severity: "high",
		hint: "格上げの型。A を持ち出さず、B が何かを最初から書く",
	},
	{
		re: /ではなく、?[^。]+(である|です|だ|なのだ|なのです|ます)$/,
		label: "Aではなく、Bである",
		severity: "mid",
		hint: "誤解を正すとき以外は対比をやめて、B だけを言い切る",
	},
	{
		re: /であり、[^。]*?であり、/,
		label: "Aであり、Bであり、Cである",
		severity: "mid",
		hint: "三点並列の型。1 つに絞るか、それぞれを別の文にする",
	},
	{
		re: /することで、?[^。]*?(できる|できます|可能になる|可能になります|なる|なります|につながる|につながります)$/,
		label: "Aすることで、Bできる",
		severity: "mid",
		hint: "手段と効果の定型。「A すると B」か、効果を主語にして書く",
	},
	{
		re: /ここで(大事|大切|重要|肝心|ポイント)(なの|となるの)は/,
		label: "ここで大事なのは〜",
		severity: "high",
		hint: "強調の前置き。大事な中身をそのまま書く",
	},
];

export const r11Syntax: Rule = (ctx) => {
	const out: Finding[] = [];
	const prose = ctx.paragraphs.filter((p) => p.kind === "prose");
	const perParagraph = prose.map((p) => splitSentences(p));

	for (const sentences of perParagraph) {
		for (const s of sentences) {
			const core = s.text.replace(/[。！？!?」』）)\s]+$/u, "");
			let matched = false;
			for (const p of SENTENCE_PATTERNS) {
				if (matched) break;
				const hit = findAll(core, p.re, s.start)[0];
				if (!hit) continue;
				matched = true; // 1 文に 1 件。「単なる〜ではなく」を「〜ではなく」で二重に数えない
				out.push({
					ruleId: "R11",
					severity: p.severity,
					message: `「${p.label}」型`,
					range: { start: hit.start, end: hit.end },
					excerpt: excerptOf(ctx.text, hit.start, hit.end, 4),
					hint: p.hint,
				});
			}
		}
		// 接続詞で始まる文が 3 連続
		let run: Segment[] = [];
		const flush = () => {
			if (run.length >= 3) {
				const first = run[0];
				const last = run[run.length - 1];
				if (first && last) {
					out.push({
						ruleId: "R11",
						severity: "mid",
						message: `「一方で〜。しかし〜。だから〜」型（接続詞始まりが ${run.length} 文連続）`,
						range: { start: first.start, end: last.end },
						excerpt: excerptOf(ctx.text, first.start, last.end, 0),
						hint: "接続詞を全部消して読んでみる。たいてい通じる。通じないところだけ 1 つ戻す",
					});
				}
			}
			run = [];
		};
		for (const s of sentences) {
			if (CONJ_LEAD_RE.test(s.text)) run.push(s);
			else flush();
		}
		flush();
	}
	return out.toSorted((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));
};
