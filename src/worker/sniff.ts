import type { Report, SniffResult } from "../core/index.ts";

export const SNIFF_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
export const SNIFF_MAX_CHARS = 8000;

const SYSTEM_PROMPT = `あなたは日本語文章の編集者です。渡された文章が「AI が生成したように読めるか」を診断し、必ず JSON だけを返します。説明文やマークダウンの囲みは付けません。

判定の観点:
1. 失敗・迷い・未解決の話が具体的に書かれているか（あれば、その箇所を 40 字以内で引用）
2. 各見出しの直後の文が「定義や説明」ではなく「結論」か「具体例」から始まっているか
3. 全体として、書き手固有の経験・数字・固有名詞・本音があるか。常套句や均一な段落構成が目立てば AI らしさが高い

出力 JSON スキーマ:
{
  "probability": 0〜100 の整数（AI が書いた確率）,
  "verdict": 40 字以内の一言講評（辛口で、具体的に）,
  "failureStory": { "found": true|false, "quote": "引用または空文字" },
  "headingLeads": [ { "heading": "見出し", "ok": true|false, "reason": "20 字以内" } ],
  "rewrites": [ { "before": "最も AI 臭い原文の一文", "after": "人が書いたように直した文", "why": "20 字以内" } ]
}
rewrites は最大 3 件。headingLeads は見出しが無ければ空配列。/no_think`;

export function buildMessages(text: string, report: Report) {
	const hints = report.findings
		.slice(0, 12)
		.map((f) => `- ${f.ruleId} ${f.message}`)
		.join("\n");
	return [
		{ role: "system", content: SYSTEM_PROMPT },
		{
			role: "user",
			content: `静的解析の指摘（参考）:\n${hints || "(なし)"}\n\n---- 文章ここから ----\n${text}\n---- 文章ここまで ----`,
		},
	];
}

/** モデル出力から JSON を取り出す。<think> ブロックやコードフェンスは捨てる */
export function extractJson(raw: string): unknown {
	const cleaned = raw
		.replace(/<think>[\s\S]*?<\/think>/g, "")
		.replace(/```(?:json)?/g, "")
		.trim();
	const start = cleaned.indexOf("{");
	const end = cleaned.lastIndexOf("}");
	if (start < 0 || end <= start) throw new Error("no json object");
	return JSON.parse(cleaned.slice(start, end + 1));
}

export function normalizeResult(input: unknown): Omit<SniffResult, "model"> {
	const o = (input ?? {}) as Record<string, unknown>;
	const num = Number(o.probability);
	const fs = (o.failureStory ?? {}) as Record<string, unknown>;
	const leads = Array.isArray(o.headingLeads) ? o.headingLeads : [];
	const rewrites = Array.isArray(o.rewrites) ? o.rewrites : [];
	return {
		probability: Number.isFinite(num) ? Math.max(0, Math.min(100, Math.round(num))) : 50,
		verdict: String(o.verdict ?? "").slice(0, 80),
		failureStory: { found: Boolean(fs.found), quote: String(fs.quote ?? "").slice(0, 80) },
		headingLeads: leads.slice(0, 12).map((l) => {
			const x = (l ?? {}) as Record<string, unknown>;
			return {
				heading: String(x.heading ?? "").slice(0, 60),
				ok: Boolean(x.ok),
				reason: String(x.reason ?? "").slice(0, 40),
			};
		}),
		rewrites: rewrites.slice(0, 3).map((r) => {
			const x = (r ?? {}) as Record<string, unknown>;
			return {
				before: String(x.before ?? "").slice(0, 200),
				after: String(x.after ?? "").slice(0, 200),
				why: String(x.why ?? "").slice(0, 40),
			};
		}),
	};
}

/** Workers AI の応答は OpenAI 互換形式と { response } 形式の両方がありうる */
export function responseText(out: unknown): string {
	const o = (out ?? {}) as Record<string, unknown>;
	if (typeof o.response === "string") return o.response;
	const choices = o.choices as { message?: { content?: string } }[] | undefined;
	const c = choices?.[0]?.message?.content;
	if (typeof c === "string") return c;
	throw new Error("unexpected ai response shape");
}

export async function sniff(ai: Ai, text: string, report: Report): Promise<SniffResult> {
	const out = await ai.run(
		SNIFF_MODEL as Parameters<Ai["run"]>[0],
		{
			messages: buildMessages(text, report),
			max_tokens: 1200,
			temperature: 0.2,
		} as never,
	);
	const parsed = normalizeResult(extractJson(responseText(out)));
	return { ...parsed, model: SNIFF_MODEL };
}
