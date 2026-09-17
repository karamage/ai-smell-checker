import type { RuleId, RuleMeta } from "../types.ts";

export const RULES: Record<RuleId, RuleMeta> = {
	R0: {
		id: "R0",
		name: "禁止ワード",
		checklist: "AI臭い禁止ワードを含んでいないか",
		color: "#ff3b6b",
	},
	R1: {
		id: "R1",
		name: "です・ます連打",
		checklist: "「です」「ます」が3回以上連続していないか",
		color: "#ff7a3b",
	},
	R2: {
		id: "R2",
		name: "箇条書き連発",
		checklist: "箇条書きが3個以上連続するブロックがないか",
		color: "#ffb03b",
	},
	R3: {
		id: "R3",
		name: "逃げの断定",
		checklist: "「〜と言えるでしょう」「〜ではないでしょうか」がないか",
		color: "#ffd23b",
	},
	R4: {
		id: "R4",
		name: "段落が均一",
		checklist: "段落の長さにバラつきがあるか（1行〜5行が混在）",
		color: "#c8ff3b",
	},
	R5: {
		id: "R5",
		name: "まず・次に・最後に",
		checklist: "「まず」「次に」「最後に」で段落が始まっていないか",
		color: "#7dff6b",
	},
	R6: {
		id: "R6",
		name: "失敗談ゼロ",
		checklist: "失敗・迷い・未解決の話が1つ以上あるか",
		color: "#3dffc0",
	},
	R7: {
		id: "R7",
		name: "主語なし",
		checklist: "主語（自分は/このブログでは/我々は）が入っているか",
		color: "#3bd6ff",
	},
	R8: {
		id: "R8",
		name: "口癖の繰り返し",
		checklist: "同じ口語表現を2回以上使っていないか",
		color: "#7c8cff",
	},
	R9: {
		id: "R9",
		name: "見出し直後が説明",
		checklist: "見出し直後が「説明」ではなく「結論」か「具体例」か",
		color: "#c77dff",
	},
	R10: {
		id: "R10",
		name: "リズムが単調",
		checklist: "文の長短にメリハリがあるか（文長・文末・文頭・段落の均質さ）",
		color: "#ff8ae2",
	},
	R11: {
		id: "R11",
		name: "AI 構文",
		checklist: "「Aではなく、Bである」「Aであり、Bであり」「Aすることで、Bできる」型の構文がないか",
		color: "#ff9a9a",
	},
	R12: {
		id: "R12",
		name: "変な比喩",
		checklist: "地図・土台・柱・潤滑油・エンジンのような比喩に頼っていないか",
		color: "#f7b267",
	},
};

export const RULE_IDS: RuleId[] = [
	"R0",
	"R1",
	"R2",
	"R3",
	"R4",
	"R5",
	"R6",
	"R7",
	"R8",
	"R9",
	"R10",
	"R11",
	"R12",
];

/** 文書全体を見るルール。短い文書では評価しない */
export const DOCUMENT_RULES: RuleId[] = ["R4", "R6", "R7", "R10"];

/** これ未満の文字数では文書全体ルールを評価しない */
export const DOCUMENT_RULE_MIN_LENGTH = 400;

/** これ未満の文字数では指数を出さない */
export const MIN_LENGTH = 100;
