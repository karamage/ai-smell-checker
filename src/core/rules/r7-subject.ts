import { SUBJECT_WORDS } from "../dict/subject.ts";
import type { Rule } from "../types.ts";

/** 一人称主語が 1 つも無ければ指摘する（文書全体） */
export const r7Subject: Rule = (ctx) => {
	const hit = SUBJECT_WORDS.some((re) => re.test(ctx.text));
	if (hit) return [];
	return [
		{
			ruleId: "R7",
			severity: "high",
			message: "「私は」「自分は」「このブログでは」のような主語が 1 つもない",
			range: null,
			excerpt: "",
			hint: "誰が書いているのかを 1 箇所で良いので明かす。「自分はこう思う」「うちのチームでは」",
		},
	];
};
