import { RULE_IDS } from "./rules/meta.ts";
import { levelOf } from "./score.ts";
import type { LevelInfo, Report, RuleId } from "./types.ts";

export interface ShareData {
	score: number;
	level: LevelInfo;
	/** 指摘のあったルール */
	rules: RuleId[];
	/** 指摘の総数（255 で飽和） */
	count: number;
}

const VERSION = 2;
const MASK_BITS = 11;
const MASK_BITS_V1 = 10;

/**
 * 共有コード。本文は含めない。
 * [version:4bit][score:7bit][ruleMask:11bit][count:8bit] を 4 byte に詰め、末尾に XOR チェックサム。
 * v1 はルールマスクが 10bit（R0〜R9）。読む側は両方受け付ける。
 */
export function encodeShare(report: Report): string {
	const mask = RULE_IDS.reduce((m, id, i) => (report.counts[id] > 0 ? m | (1 << i) : m), 0);
	const count = Math.min(255, report.findings.length);
	let bits = BigInt(VERSION & 0xf);
	bits = (bits << 7n) | BigInt(report.score & 0x7f);
	bits = (bits << BigInt(MASK_BITS)) | BigInt(mask & ((1 << MASK_BITS) - 1));
	bits = (bits << 8n) | BigInt(count & 0xff);
	// 30 bit → 4 byte
	const bytes = new Uint8Array(5);
	for (let i = 3; i >= 0; i--) {
		bytes[i] = Number(bits & 0xffn);
		bits >>= 8n;
	}
	bytes[4] = (bytes[0] ?? 0) ^ (bytes[1] ?? 0) ^ (bytes[2] ?? 0) ^ (bytes[3] ?? 0) ^ 0x5a;
	return base64url(bytes);
}

export function decodeShare(code: string): ShareData | null {
	let bytes: Uint8Array;
	try {
		bytes = fromBase64url(code);
	} catch {
		return null;
	}
	if (bytes.length !== 5) return null;
	const check = (bytes[0] ?? 0) ^ (bytes[1] ?? 0) ^ (bytes[2] ?? 0) ^ (bytes[3] ?? 0) ^ 0x5a;
	if (check !== bytes[4]) return null;
	let bits = 0n;
	for (let i = 0; i < 4; i++) bits = (bits << 8n) | BigInt(bytes[i] ?? 0);
	// v2 は 30bit（版は bit 29..26）、v1 は 29bit（版は bit 28..25）。v2 の版フィールドが 2 なら
	// v1 として読んだ版フィールドは 4 か 5 になるので取り違えない
	const version =
		Number((bits >> 26n) & 0xfn) === VERSION ? VERSION : Number((bits >> 25n) & 0xfn) === 1 ? 1 : 0;
	if (version !== 1 && version !== VERSION) return null;
	const maskBits = version === 1 ? MASK_BITS_V1 : MASK_BITS;
	const count = Number(bits & 0xffn);
	bits >>= 8n;
	const mask = Number(bits & BigInt((1 << maskBits) - 1));
	bits >>= BigInt(maskBits);
	const score = Number(bits & 0x7fn);
	if (score > 100) return null;
	const rules = RULE_IDS.filter((_, i) => (mask & (1 << i)) !== 0);
	return { score, level: levelOf(score), rules, count };
}

function base64url(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64url(s: string): Uint8Array {
	if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error("invalid");
	const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
	const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
	return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}
