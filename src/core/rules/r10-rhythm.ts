import { excerptOf, splitSentences } from "../segment.ts";
import type { Finding, Rule, Segment } from "../types.ts";

/**
 * 文章のリズム。natural-japanese（https://github.com/coji/natural-japanese）の
 * lint.py にある統計系検出器を、形態素解析なし（文字数ベース）で移植したもの。
 * burstiness = (σ − μ) / (σ + μ) は変動係数 CV の単調変換なので、
 * 閾値 −0.24 は CV ≈ 0.61 に相当する。
 */
export const RHYTHM = {
	/** これ未満の文数では統計を出さない */
	minSentences: 6,
	/** natural-japanese BURSTINESS_THRESHOLD */
	burstiness: -0.24,
	/** natural-japanese SENTENCE_VARIANCE_CV_THRESHOLD。ここまで均質なら重い指摘 */
	uniformCv: 0.25,
	/** natural-japanese AUTOCORR_THRESHOLD（lag-1 自己相関） */
	autocorr: 0.6,
	autocorrMinPairs: 4,
	/** natural-japanese UNIFORM_PARAGRAPH_CV_THRESHOLD（段落あたり文数） */
	paragraphCv: 0.15,
	paragraphMin: 4,
	/** 同じ文末の型（た形・る形など）が何文続いたら指摘するか。です・ます は R1 が見る */
	endingRun: 5,
	/** 同じ文頭 2 文字が何文あったら指摘するか（natural-japanese essay プロファイル） */
	leadRepeat: 5,
} as const;

const TRAIL_RE = /[。！？!?」』）)\s]+$/u;

/** 文末を活用形のクラスに丸める。です・ます は R1 が見るので null */
const ENDING_CLASSES: [RegExp, string][] = [
	[/(でしょう|だろう|だろうか)$/, "〜だろう"],
	[/(ません|ませんでした)$/, "〜ません"],
	[/(ている|ていた|ていない|てる|てた)$/, "〜ている"],
	[/(ない|なかった)$/, "〜ない"],
	[/(である|であった)$/, "〜である"],
	[/だ$/, "〜だ"],
	[/た$/, "〜た"],
	[/[るうくすつぬぶむぐ]$/, "〜る（言い切り）"],
	[/い$/, "〜い"],
];

export function endingClass(core: string): string | null {
	if (/(です|ます|ました|でした)$/.test(core)) return null;
	for (const [re, label] of ENDING_CLASSES) if (re.test(core)) return label;
	return core.length >= 2 ? `〜${core.slice(-1)}` : null;
}

function mean(xs: number[]): number {
	return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function stdev(xs: number[], m = mean(xs)): number {
	return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length);
}

export function burstinessOf(lengths: number[]): number {
	const m = mean(lengths);
	const s = stdev(lengths, m);
	return s + m === 0 ? 0 : (s - m) / (s + m);
}

export function lag1Autocorr(xs: number[]): number | null {
	const a = xs.slice(0, -1);
	const b = xs.slice(1);
	if (a.length < RHYTHM.autocorrMinPairs) return null;
	const ma = mean(a);
	const mb = mean(b);
	const sa = stdev(a, ma);
	const sb = stdev(b, mb);
	if (sa === 0 || sb === 0) return null;
	const cov = a.reduce((acc, x, i) => acc + (x - ma) * ((b[i] ?? 0) - mb), 0) / a.length;
	return cov / (sa * sb);
}

export const r10Rhythm: Rule = (ctx) => {
	const out: Finding[] = [];
	const prose = ctx.paragraphs.filter((p) => p.kind === "prose");
	const perParagraph = prose.map((p) => splitSentences(p));
	const sentences: Segment[] = perParagraph.flat();
	if (sentences.length < RHYTHM.minSentences) return out;

	const cores = sentences.map((s) => s.text.replace(TRAIL_RE, ""));
	const lengths = cores.map((c) => c.length);

	// 1. 文長のメリハリ（burstiness / 変動係数）
	const m = mean(lengths);
	const cv = m === 0 ? 0 : stdev(lengths, m) / m;
	const b = burstinessOf(lengths);
	if (cv < RHYTHM.uniformCv) {
		out.push({
			ruleId: "R10",
			severity: "high",
			message: `文の長さがほぼ一定（${sentences.length} 文、平均 ${m.toFixed(0)} 字、変動係数 ${cv.toFixed(2)}）`,
			range: null,
			excerpt: "",
			hint: "一桁の文と 80 字を超える文を同じ段落に同居させる。言い切りの短文を意識して混ぜる",
		});
	} else if (b < RHYTHM.burstiness) {
		out.push({
			ruleId: "R10",
			severity: "mid",
			message: `文の長短にメリハリがない（burstiness ${b.toFixed(2)}、閾値 ${RHYTHM.burstiness}）`,
			range: null,
			excerpt: "",
			hint: "長い文の直後に短い文を置く。「それだけだった。」のような 10 字前後の文が効果的",
		});
	}

	// 2. 隣接する文の長さの相関
	const ac = lag1Autocorr(lengths);
	if (ac !== null && ac > RHYTHM.autocorr) {
		out.push({
			ruleId: "R10",
			severity: "low",
			message: `隣り合う文の長さが同じパターンで繰り返される（lag-1 自己相関 ${ac.toFixed(2)}）`,
			range: null,
			excerpt: "",
			hint: "「長い・長い・短い」の型が固定していないか。段落の途中で文の並びを崩す",
		});
	}

	// 3. 段落あたり文数の均質さ
	const counts = perParagraph.map((ss) => ss.length).filter((n) => n > 0);
	if (counts.length >= RHYTHM.paragraphMin) {
		const pm = mean(counts);
		const pcv = pm === 0 ? 0 : stdev(counts, pm) / pm;
		if (pcv < RHYTHM.paragraphCv) {
			out.push({
				ruleId: "R10",
				severity: "low",
				message: `どの段落も同じ文数（${counts.join(", ")} 文）`,
				range: null,
				excerpt: "",
				hint: "3 文段落の量産は定型段落の疑い。1 文だけの段落や 6 文の段落を作る",
			});
		}
	}

	// 4. 同じ文末の連続（です・ます 以外）
	let run: Segment[] = [];
	let current = "";
	const flushRun = () => {
		if (run.length >= RHYTHM.endingRun && current) {
			const first = run[0];
			const last = run[run.length - 1];
			if (first && last) {
				out.push({
					ruleId: "R10",
					severity: "mid",
					message: `「${current}」型の文末が ${run.length} 連続`,
					range: { start: first.start, end: last.end },
					excerpt: excerptOf(ctx.text, first.start, last.end, 0),
					hint: "文末を変える。体言止め、問いかけ、「〜だろう」「〜らしい」を 1 つ挟む",
				});
			}
		}
		run = [];
		current = "";
	};
	perParagraph.forEach((ss, pi) => {
		if (
			pi > 0 &&
			prose[pi - 1] &&
			ctx.paragraphs.indexOf(prose[pi] as never) - ctx.paragraphs.indexOf(prose[pi - 1] as never) >
				1
		) {
			flushRun(); // 見出しや箇条書きを挟んだら連続とみなさない
		}
		for (const s of ss) {
			const ending = endingClass(s.text.replace(TRAIL_RE, ""));
			if (ending !== null && ending === current) {
				run.push(s);
			} else {
				flushRun();
				if (ending !== null) {
					current = ending;
					run = [s];
				}
			}
		}
	});
	flushRun();

	// 5. 同じ文頭の反復
	const leads = new Map<string, Segment[]>();
	for (const s of sentences) {
		const lead = s.text.slice(0, 2);
		if (lead.length < 2) continue;
		leads.set(lead, [...(leads.get(lead) ?? []), s]);
	}
	for (const [lead, ss] of leads) {
		if (ss.length < RHYTHM.leadRepeat) continue;
		const first = ss[0];
		if (!first) continue;
		out.push({
			ruleId: "R10",
			severity: "low",
			message: `「${lead}」で始まる文が ${ss.length} 回`,
			range: { start: first.start, end: first.start + 2 },
			excerpt: excerptOf(ctx.text, first.start, first.start + 2, 16),
			hint: "書き出しの型が固定している。主語を変えるか、前の文に続けて 1 文にする",
		});
	}

	return out;
};
