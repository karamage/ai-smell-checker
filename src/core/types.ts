export type RuleId =
	| "R0"
	| "R1"
	| "R2"
	| "R3"
	| "R4"
	| "R5"
	| "R6"
	| "R7"
	| "R8"
	| "R9"
	| "R10"
	| "R11"
	| "R12";

export type Severity = "high" | "mid" | "low";

export interface Range {
	/** 文字オフセット（UTF-16 code unit）。含む */
	start: number;
	/** 文字オフセット。含まない */
	end: number;
}

export interface Finding {
	ruleId: RuleId;
	severity: Severity;
	/** 何が臭いのか。ユーザーに見せる一文 */
	message: string;
	/** 文書全体への指摘なら null */
	range: Range | null;
	/** 該当箇所の抜粋（範囲が無い場合は空文字） */
	excerpt: string;
	/** どう直せばいいか */
	hint: string;
}

export interface RuleMeta {
	id: RuleId;
	/** 短い名前（UI のタグ用） */
	name: string;
	/** チェックリスト原文 */
	checklist: string;
	/** UI の色 */
	color: string;
}

export interface LevelInfo {
	index: 0 | 1 | 2 | 3 | 4;
	label: string;
	emoji: string;
	tagline: string;
	color: string;
}

export interface Report {
	/** 解析した文字数 */
	length: number;
	/** 100 字未満で指数を出していない */
	tooShort: boolean;
	/** 臭気指数 0〜100。高いほど AI 臭い */
	score: number;
	level: LevelInfo;
	findings: Finding[];
	/** ルールごとの指摘件数 */
	counts: Record<RuleId, number>;
	/** 指摘ゼロだったルール */
	passed: RuleId[];
	/** 文書が短くて評価しなかったルール */
	skipped: RuleId[];
}

export interface Segment {
	text: string;
	start: number;
	end: number;
}

export interface Paragraph extends Segment {
	kind: "heading" | "list" | "code" | "prose";
	/** 見出しレベル。見出しでなければ 0 */
	headingLevel: number;
}

export interface RuleContext {
	/** コードを空白でマスクした本文。オフセットは原文と一致する */
	text: string;
	paragraphs: Paragraph[];
	/** prose 段落の文リスト */
	sentences: Segment[];
	/** マスク前の原文 */
	raw: string;
}

export type Rule = (ctx: RuleContext) => Finding[];
