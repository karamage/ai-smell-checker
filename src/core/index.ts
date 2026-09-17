import {
	DOCUMENT_RULE_MIN_LENGTH,
	DOCUMENT_RULES,
	MIN_LENGTH,
	RULE_IDS,
	RULE_IMPL,
} from "./rules/index.ts";
import { levelOf, scoreOf } from "./score.ts";
import { buildContext } from "./segment.ts";
import type { Finding, Report, RuleId } from "./types.ts";

export { MIN_LENGTH, RULE_IDS, RULES } from "./rules/meta.ts";
export { LEVELS, levelOf, scoreOf } from "./score.ts";
export { decodeShare, encodeShare, type ShareData } from "./share.ts";
export type * from "./types.ts";

/** 文章を解析して臭気レポートを返す。純関数 */
export function analyze(raw: string): Report {
	const ctx = buildContext(raw);
	const length = raw.replace(/\s/g, "").length;
	const tooShort = length < MIN_LENGTH;
	const skipped: RuleId[] = length < DOCUMENT_RULE_MIN_LENGTH ? [...DOCUMENT_RULES] : [];

	const findings: Finding[] = [];
	for (const id of RULE_IDS) {
		if (skipped.includes(id)) continue;
		findings.push(...RULE_IMPL[id](ctx));
	}
	findings.sort((a, b) => {
		if (a.range && b.range) return a.range.start - b.range.start;
		if (a.range) return -1;
		if (b.range) return 1;
		return 0;
	});

	const counts = Object.fromEntries(RULE_IDS.map((id) => [id, 0])) as Record<RuleId, number>;
	for (const f of findings) counts[f.ruleId]++;
	const passed = RULE_IDS.filter((id) => counts[id] === 0 && !skipped.includes(id));

	const score = tooShort ? 0 : scoreOf(findings);
	return { length, tooShort, score, level: levelOf(score), findings, counts, passed, skipped };
}
