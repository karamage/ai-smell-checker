import { RULE_IDS, RULES } from "./rules/meta.ts";
import type { Finding, Report, RuleId } from "./types.ts";

const MAX_EXAMPLES = 8;
const MAX_HINTS = 3;

/** 言い換えの結果として新しく混入しがちな常套句。プロンプトの末尾で釘を刺す */
const DO_NOT_INTRODUCE = [
	"重要なのは",
	"〜と言えるでしょう",
	"〜ではないでしょうか",
	"まとめると",
	"いかがでしたか",
	"〜することができます",
	"様々な",
	"非常に",
	"〜していきます",
	"本質的に",
	"解像度を上げる",
];

const uniq = <T>(xs: T[]): T[] => [...new Set(xs)];

function excerptFor(f: Finding, text: string): string | null {
	if (!f.range) return null;
	return text.slice(f.range.start, f.range.end).replace(/\s+/g, " ").trim();
}

function ruleSection(id: RuleId, findings: Finding[], text: string): string {
	const meta = RULES[id];
	const lines: string[] = [`### ${meta.name}（${findings.length} 件）`];
	const examples = uniq(findings.map((f) => excerptFor(f, text)).filter((x): x is string => !!x));
	const docLevel = findings.filter((f) => !f.range);
	if (examples.length > 0) {
		const shown = examples
			.slice(0, MAX_EXAMPLES)
			.map((e) => `「${e.length > 40 ? `${e.slice(0, 40)}…` : e}」`);
		const rest = examples.length > MAX_EXAMPLES ? ` ほか ${examples.length - MAX_EXAMPLES} 件` : "";
		lines.push(`該当箇所: ${shown.join("")}${rest}`);
	}
	for (const f of docLevel) lines.push(`状況: ${f.message}`);
	for (const h of uniq(findings.map((f) => f.hint)).slice(0, MAX_HINTS)) lines.push(`→ ${h}`);
	return lines.join("\n");
}

/**
 * 解析結果から、LLM に書き直しを頼むためのプロンプトを組み立てる。
 * 指摘のあったルールだけを載せ、言い換えで別の常套句を混入させない制約を付ける。
 */
export function buildPrompt(text: string, report: Report): string {
	const byRule = new Map<RuleId, Finding[]>();
	for (const f of report.findings) byRule.set(f.ruleId, [...(byRule.get(f.ruleId) ?? []), f]);
	const sections = RULE_IDS.filter((id) => byRule.has(id)).map((id) =>
		ruleSection(id, byRule.get(id) ?? [], text),
	);
	const politeness = /(です|ます)[。！？]/.test(text) ? "です・ます調" : "だ・である調";
	const head = report.tooShort
		? "## 静的解析の結果\n本文が短いため指数は出ていません。"
		: `## 静的解析で見つかった問題（臭気指数 ${report.score} / 100、Lv.${report.level.index} ${report.level.label}）`;

	return [
		"あなたは日本語の編集者です。次の「本文」を、内容と情報量を変えずに、AI が書いたように読める癖を消して書き直してください。",
		"",
		"## 守ること",
		"- 事実、数字、固有名詞、主張は変えない。文字数は元の 8 割から 12 割に収める",
		`- 文体は元のまま（${politeness}）。書き手の一人称や口調も保つ`,
		"- 太字、ダッシュ（---、—）、✅ などの記号、箇条書き、見出しを新しく増やさない",
		"- 出力は書き直した本文だけ。前置き、解説、「改善版」のような見出しは付けない",
		"",
		head,
		...(sections.length > 0
			? ["", ...sections.flatMap((s) => [s, ""])]
			: ["", "指摘はありません。読み直して気になる箇所だけ整えてください。", ""]),
		"## 言い換えで新しく入れてはいけないもの",
		`- 常套句: ${DO_NOT_INTRODUCE.map((w) => `「${w}」`).join("")}`,
		"- 「Aではなく、Bである」「Aすることで、Bできる」「Aであり、Bであり、Cである」型の構文",
		"- 地図、土台、柱、エンジン、レシピ、羅針盤、潤滑油のような比喩",
		"- 「まず」「次に」「最後に」で始まる段落",
		"",
		"## 本文",
		'"""',
		text.trim(),
		'"""',
	].join("\n");
}
