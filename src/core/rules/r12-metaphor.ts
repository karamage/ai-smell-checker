import { excerptOf, findAll } from "../segment.ts";
import type { Finding, Rule } from "../types.ts";

/**
 * AI が好む「変な比喩」。
 * 「仕様書」「エンジン」「レシピ」などは文字通りの意味で技術記事に普通に出るので、
 * 比喩として使われた形（「成長の土台となる」「成功のレシピです」）だけを拾う。
 */
type Mode = "always" | "either" | "predicate";

interface MetaphorEntry {
	label: string;
	word: RegExp;
	/**
	 * always: 出たら常に比喩とみなす
	 * either: 「〜の◯◯」か「◯◯となる／である／のような」のどちらかで比喩
	 * predicate: 「◯◯となる／である／のような」のときだけ比喩（literal 用法が多い語）
	 */
	mode: Mode;
}

/** 比喩の述語。「土台となる」「地図のような」「レシピです」 */
const PREDICATE =
	"(?:のよう|みたい|とな[るっりらろ]|にな[るっりらろ]|である|であり|でもある|だ(?=[。、！\\s]|$)|です|として|に例え|に喩え|と言え|といえ|と同じ|に近い|に過ぎ|に相当|に当た|にあた|と呼|と捉え|ととらえ|を築|を固め|を据え|を支え)";
/** 「成長の土台」「組織の DNA」のように抽象名詞に「の」で繋がる */
const POSSESSIVE = "(?<=[^\\s、。「」『』（）()]{1,12}の\\s?)";

const ENTRIES: MetaphorEntry[] = [
	{ label: "羅針盤", word: /羅針盤|コンパス/, mode: "always" },
	{ label: "車の両輪", word: /車の両輪|両輪/, mode: "always" },
	{ label: "潤滑油", word: /潤滑油/, mode: "always" },
	{ label: "土台", word: /土台/, mode: "either" },
	{ label: "柱", word: /(?:\d+|[一二三四五六七八九十]+)?本?の?柱(?!状|時計|書)/, mode: "either" },
	{ label: "筋トレ", word: /筋トレ/, mode: "either" },
	{ label: "スパイス", word: /スパイス/, mode: "either" },
	{ label: "DNA", word: /DNA|ＤＮＡ/, mode: "either" },
	{ label: "地図", word: /地図/, mode: "predicate" },
	{ label: "仕様書", word: /仕様書/, mode: "predicate" },
	{ label: "設計書", word: /設計書/, mode: "predicate" },
	{ label: "栄養", word: /栄養(?!素|価|士|学|バランス|失調)/, mode: "predicate" },
	{ label: "筋肉", word: /筋肉(?!痛|量|質)/, mode: "predicate" },
	{ label: "エンジン", word: /エンジン/, mode: "predicate" },
	{ label: "レシピ", word: /レシピ/, mode: "predicate" },
];

function patternFor(e: MetaphorEntry): RegExp {
	const w = `(?:${e.word.source})`;
	switch (e.mode) {
		case "always":
			return new RegExp(w, "u");
		case "either":
			return new RegExp(`${POSSESSIVE}${w}|${w}(?=${PREDICATE})`, "u");
		case "predicate":
			return new RegExp(`${w}(?=${PREDICATE})`, "u");
	}
}

const PATTERNS = ENTRIES.map((e) => ({ entry: e, re: patternFor(e) }));

export const r12Metaphor: Rule = (ctx) => {
	const out: Finding[] = [];
	for (const { entry, re } of PATTERNS) {
		for (const m of findAll(ctx.text, re)) {
			out.push({
				ruleId: "R12",
				severity: entry.mode === "always" ? "high" : "mid",
				message: `比喩「${entry.label}」（${m.text}）`,
				range: { start: m.start, end: m.end },
				excerpt: excerptOf(ctx.text, m.start, m.end),
				hint: "比喩をやめて、何がどう役に立つのかをそのまま書く。「土台」なら何を先に決めたのか、「エンジン」なら何が何を動かすのか",
			});
		}
	}
	return out.toSorted((a, b) => (a.range?.start ?? 0) - (b.range?.start ?? 0));
};
