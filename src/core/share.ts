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

const VERSION = 3;
/** v3 のルールマスク幅。ルールが増えても共有コードの形式を変えずに済む */
const MASK_BITS = 16;
/** v1（R0〜R9）と v2（R0〜R10）は 5 byte 形式 */
const LEGACY_MASK_BITS: Record<number, number> = { 1: 10, 2: 11 };

/**
 * 共有コード。本文は含めない。
 * v3: [version:4bit][score:7bit][ruleMask:16bit][count:8bit] = 35bit を 5 byte に詰め、
 * 末尾に XOR チェックサムを付けた 6 byte（base64url で 8 文字）。
 * v1/v2 は 4 byte + チェックサムの 5 byte 形式。読む側は byte 長で見分けて全部受け付ける。
 */
export function encodeShare(report: Report): string {
	const mask = RULE_IDS.reduce((m, id, i) => (report.counts[id] > 0 ? m | (1 << i) : m), 0);
	const count = Math.min(255, report.findings.length);
	let bits = BigInt(VERSION & 0xf);
	bits = (bits << 7n) | BigInt(report.score & 0x7f);
	bits = (bits << BigInt(MASK_BITS)) | BigInt(mask & ((1 << MASK_BITS) - 1));
	bits = (bits << 8n) | BigInt(count & 0xff);
	const bytes = new Uint8Array(6);
	for (let i = 4; i >= 0; i--) {
		bytes[i] = Number(bits & 0xffn);
		bits >>= 8n;
	}
	bytes[5] = checksum(bytes, 5);
	return base64url(bytes);
}

export function decodeShare(code: string): ShareData | null {
	let bytes: Uint8Array;
	try {
		bytes = fromBase64url(code);
	} catch {
		return null;
	}
	if (bytes.length !== 5 && bytes.length !== 6) return null;
	const dataLen = bytes.length - 1;
	if (checksum(bytes, dataLen) !== bytes[dataLen]) return null;
	let bits = 0n;
	for (let i = 0; i < dataLen; i++) bits = (bits << 8n) | BigInt(bytes[i] ?? 0);

	let maskBits: number;
	if (dataLen === 5) {
		if (Number((bits >> 31n) & 0xfn) !== VERSION) return null;
		maskBits = MASK_BITS;
	} else {
		// v2 は 30bit（版は bit 29..26）、v1 は 29bit（版は bit 28..25）。v2 の版フィールドが 2 なら
		// v1 として読んだ版フィールドは 4 か 5 になるので取り違えない
		const version =
			Number((bits >> 26n) & 0xfn) === 2 ? 2 : Number((bits >> 25n) & 0xfn) === 1 ? 1 : 0;
		const legacy = LEGACY_MASK_BITS[version];
		if (legacy === undefined) return null;
		maskBits = legacy;
	}
	const count = Number(bits & 0xffn);
	bits >>= 8n;
	const mask = Number(bits & BigInt((1 << maskBits) - 1));
	bits >>= BigInt(maskBits);
	const score = Number(bits & 0x7fn);
	if (score > 100) return null;
	const rules = RULE_IDS.filter((_, i) => (mask & (1 << i)) !== 0);
	return { score, level: levelOf(score), rules, count };
}

function checksum(bytes: Uint8Array, len: number): number {
	let x = 0x5a;
	for (let i = 0; i < len; i++) x ^= bytes[i] ?? 0;
	return x;
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
