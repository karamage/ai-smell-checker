import type { Paragraph, RuleContext, Segment } from "./types.ts";

/**
 * フェンスコードブロックとインラインコードを同じ長さの空白に置き換える。
 * オフセットを保ったままコードを解析対象から外す。
 */
export function maskCode(text: string): string {
	let out = text.replace(/```[\s\S]*?(```|$)/g, (m) => " ".repeat(m.length));
	out = out.replace(/`[^`\n]+`/g, (m) => " ".repeat(m.length));
	return out;
}

const HEADING_RE = /^(#{1,6})\s+\S/;
const LIST_RE = /^\s*(?:[-*+・•●○■□▪]|\d+[.．)）]|[①-⑳])\s*/;

function classify(text: string): { kind: Paragraph["kind"]; headingLevel: number } {
	const first = text.split("\n")[0] ?? "";
	const h = HEADING_RE.exec(first);
	if (h) return { kind: "heading", headingLevel: h[1]?.length ?? 1 };
	if (LIST_RE.test(first)) return { kind: "list", headingLevel: 0 };
	if (first.trim() === "") return { kind: "code", headingLevel: 0 };
	// 短い単独行で句点を含まない → 見出し扱い（Markdown を使わない人向け）
	if (
		!text.includes("\n") &&
		text.trim().length <= 30 &&
		!/[。、．，.!?！？]/.test(text) &&
		!/^[「（(]/.test(text.trim())
	) {
		return { kind: "heading", headingLevel: 0 };
	}
	return { kind: "prose", headingLevel: 0 };
}

/** 空行区切りで段落に分ける。空白のみの段落は返さない */
export function splitParagraphs(text: string): Paragraph[] {
	const out: Paragraph[] = [];
	const re = /[^\n]+(?:\n[^\n]+)*/g;
	let m: RegExpExecArray | null = re.exec(text);
	while (m !== null) {
		const raw = m[0];
		const trimmed = raw.trim();
		if (trimmed.length > 0) {
			const leading = raw.length - raw.trimStart().length;
			const start = m.index + leading;
			const c = classify(trimmed);
			out.push({ text: trimmed, start, end: start + trimmed.length, ...c });
		}
		m = re.exec(text);
	}
	return out;
}

/** 段落を文に分ける。句点・感嘆符・疑問符・改行で区切る */
export function splitSentences(seg: Segment): Segment[] {
	const out: Segment[] = [];
	const re = /[^。！？!?\n]+[。！？!?]*[」』）)]*/g;
	let m: RegExpExecArray | null = re.exec(seg.text);
	while (m !== null) {
		const raw = m[0];
		const trimmed = raw.trim();
		if (trimmed.length > 0) {
			const leading = raw.length - raw.trimStart().length;
			const start = seg.start + m.index + leading;
			out.push({ text: trimmed, start, end: start + trimmed.length });
		}
		m = re.exec(seg.text);
	}
	return out;
}

export function buildContext(raw: string): RuleContext {
	const text = maskCode(raw);
	const paragraphs = splitParagraphs(text);
	const sentences = paragraphs.filter((p) => p.kind === "prose").flatMap(splitSentences);
	return { text, paragraphs, sentences, raw };
}

/** 全角 40 字を 1 行とみなした推定行数 */
export function estimateLines(text: string, charsPerLine = 40): number {
	return text
		.split("\n")
		.reduce((n, line) => n + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

export function excerptOf(text: string, start: number, end: number, pad = 12): string {
	const s = Math.max(0, start - pad);
	const e = Math.min(text.length, end + pad);
	const head = s > 0 ? "…" : "";
	const tail = e < text.length ? "…" : "";
	return `${head}${text.slice(s, e).replace(/\n/g, " ")}${tail}`;
}

/** 正規表現の全マッチをオフセット付きで返す */
export function findAll(text: string, re: RegExp, offset = 0): Segment[] {
	const flags = re.flags.includes("g") ? re.flags : `${re.flags}g`;
	const g = new RegExp(re.source, flags);
	const out: Segment[] = [];
	let m: RegExpExecArray | null = g.exec(text);
	while (m !== null) {
		if (m[0].length === 0) {
			g.lastIndex++;
		} else {
			out.push({ text: m[0], start: offset + m.index, end: offset + m.index + m[0].length });
		}
		m = g.exec(text);
	}
	return out;
}
