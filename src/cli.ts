#!/usr/bin/env bun
import { analyze, RULE_IDS, RULES } from "./core/index.ts";

const args = process.argv.slice(2);
const json = args.includes("--json");
const thresholdIdx = args.indexOf("--threshold");
const threshold = thresholdIdx >= 0 ? Number(args[thresholdIdx + 1]) : Number.NaN;
const files = args.filter((a, i) => !a.startsWith("--") && i !== thresholdIdx + 1);

if (args.includes("--help") || args.includes("-h")) {
	console.log(`niou — AI臭い文章チェッカー

使い方:
  bun run cli <file.md> [<file2.md> ...] [--json] [--threshold N]
  cat draft.md | bun run cli

  --json          レポートを JSON で出力
  --threshold N   臭気指数が N 以上のファイルがあれば exit 1（CI 向け）`);
	process.exit(0);
}

const esc = (n: number) => `\x1b[${n}m`;
const bold = (s: string) => `${esc(1)}${s}${esc(0)}`;
const dim = (s: string) => `${esc(2)}${s}${esc(0)}`;
const rgb = (hex: string, s: string) => {
	const n = Number.parseInt(hex.slice(1), 16);
	return `\x1b[38;2;${(n >> 16) & 255};${(n >> 8) & 255};${n & 255}m${s}${esc(0)}`;
};

async function readInput(): Promise<{ name: string; text: string }[]> {
	if (files.length === 0) {
		const text = await Bun.stdin.text();
		return [{ name: "(stdin)", text }];
	}
	return Promise.all(files.map(async (f) => ({ name: f, text: await Bun.file(f).text() })));
}

let failed = false;
const inputs = await readInput();
const reports = inputs.map(({ name, text }) => ({ name, report: analyze(text) }));

if (json) {
	console.log(JSON.stringify(reports.length === 1 ? reports[0]?.report : reports, null, 2));
} else {
	for (const { name, report } of reports) {
		const lv = report.level;
		console.log("");
		console.log(`${bold("👃 NIOU")} ${dim(name)}`);
		if (report.tooShort) {
			console.log(dim("  100 字未満なので指数は出しません"));
		} else {
			console.log(
				`  臭気指数 ${rgb(lv.color, bold(String(report.score)))} / 100  ${lv.emoji} ${rgb(lv.color, bold(lv.label))}  ${dim(lv.tagline)}`,
			);
		}
		console.log("");
		for (const id of RULE_IDS) {
			const n = report.counts[id];
			const mark = report.skipped.includes(id)
				? dim("－")
				: n === 0
					? rgb("#3dffa0", "✔")
					: rgb("#ff3b6b", "✘");
			const tail = n > 0 ? dim(` ×${n}`) : "";
			console.log(`  ${mark} ${RULES[id].checklist}${tail}`);
		}
		const ranged = report.findings.filter((f) => f.range);
		const docLevel = report.findings.filter((f) => !f.range);
		if (ranged.length > 0) {
			console.log("");
			for (const f of ranged) {
				console.log(`  ${rgb(RULES[f.ruleId].color, `[${f.ruleId}]`)} ${f.message}`);
				console.log(`      ${dim(f.excerpt)}`);
			}
		}
		for (const f of docLevel) {
			console.log(`  ${rgb(RULES[f.ruleId].color, `[${f.ruleId}]`)} ${f.message}`);
			console.log(`      ${dim(`→ ${f.hint}`)}`);
		}
		if (Number.isFinite(threshold) && report.score >= threshold) failed = true;
	}
	console.log("");
}

if (failed) {
	console.error(`臭気指数が ${threshold} 以上のファイルがあります`);
	process.exit(1);
}
