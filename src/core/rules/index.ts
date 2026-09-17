import type { Rule, RuleId } from "../types.ts";
import { r0Banned } from "./r0-banned.ts";
import { r1DesuMasu } from "./r1-desu-masu.ts";
import { r2List } from "./r2-list.ts";
import { r3Hedge } from "./r3-hedge.ts";
import { r4ParagraphVariance } from "./r4-paragraph-variance.ts";
import { r5Sequence } from "./r5-sequence.ts";
import { r6Failure } from "./r6-failure.ts";
import { r7Subject } from "./r7-subject.ts";
import { r8Colloquial } from "./r8-colloquial.ts";
import { r9HeadingLead } from "./r9-heading-lead.ts";
import { r10Rhythm } from "./r10-rhythm.ts";
import { r11Syntax } from "./r11-syntax.ts";

export const RULE_IMPL: Record<RuleId, Rule> = {
	R0: r0Banned,
	R1: r1DesuMasu,
	R2: r2List,
	R3: r3Hedge,
	R4: r4ParagraphVariance,
	R5: r5Sequence,
	R6: r6Failure,
	R7: r7Subject,
	R8: r8Colloquial,
	R9: r9HeadingLead,
	R10: r10Rhythm,
	R11: r11Syntax,
};

export * from "./meta.ts";
