import { FAILURE_WORDS } from "../dict/failure.ts";
import type { Rule } from "../types.ts";

/** 失敗・迷い・未解決の語彙が 1 つも無ければ指摘する（文書全体） */
export const r6Failure: Rule = (ctx) => {
	const hit = FAILURE_WORDS.some((re) => re.test(ctx.text));
	if (hit) return [];
	return [
		{
			ruleId: "R6",
			severity: "high",
			message: "失敗・迷い・未解決の話が 1 つもない",
			range: null,
			excerpt: "",
			hint: "うまくいかなかったこと、迷ったこと、まだ分かっていないことを 1 つ書く。失敗談は最高の人間味",
		},
	];
};
