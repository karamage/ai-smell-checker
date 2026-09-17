import type { Finding, LevelInfo, RuleId, Severity } from "./types.ts";

interface Weight {
	per: number | Record<Severity, number>;
	cap: number;
}

export const WEIGHTS: Record<RuleId, Weight> = {
	R0: { per: { high: 8, mid: 4, low: 2 }, cap: 30 },
	R1: { per: 8, cap: 16 },
	R2: { per: 6, cap: 12 },
	R3: { per: 8, cap: 16 },
	R4: { per: 10, cap: 10 },
	R5: { per: 5, cap: 10 },
	R6: { per: 10, cap: 10 },
	R7: { per: 8, cap: 8 },
	R8: { per: 3, cap: 9 },
	R9: { per: 5, cap: 10 },
	R10: { per: { high: 10, mid: 6, low: 3 }, cap: 16 },
	R11: { per: { high: 8, mid: 5, low: 3 }, cap: 16 },
	R12: { per: { high: 7, mid: 5, low: 3 }, cap: 15 },
};

export const LEVELS: LevelInfo[] = [
	{ index: 0, label: "無臭", emoji: "🌿", tagline: "人の手の匂いがする", color: "#3dffa0" },
	{ index: 1, label: "微臭", emoji: "🍃", tagline: "ほんのり AI の香り", color: "#b6ff3b" },
	{ index: 2, label: "匂う", emoji: "👃", tagline: "鼻が気づくレベル", color: "#ffd23b" },
	{ index: 3, label: "臭い", emoji: "🤢", tagline: "換気が必要", color: "#ff7a3b" },
	{ index: 4, label: "激臭", emoji: "☠️", tagline: "生成物です", color: "#ff3b6b" },
];

export function levelOf(score: number): LevelInfo {
	const idx = score >= 75 ? 4 : score >= 55 ? 3 : score >= 35 ? 2 : score >= 15 ? 1 : 0;
	return LEVELS[idx] as LevelInfo;
}

export function scoreOf(findings: Finding[]): number {
	const perRule = new Map<RuleId, number>();
	for (const f of findings) {
		const w = WEIGHTS[f.ruleId];
		const add = typeof w.per === "number" ? w.per : w.per[f.severity];
		perRule.set(f.ruleId, Math.min(w.cap, (perRule.get(f.ruleId) ?? 0) + add));
	}
	let total = 0;
	for (const v of perRule.values()) total += v;
	return Math.max(0, Math.min(100, Math.round(total)));
}
