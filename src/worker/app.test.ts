import { describe, expect, test } from "bun:test";
import { analyze, encodeShare } from "../core/index.ts";
import { SAMPLE_AI } from "../core/samples.ts";
import { createApp } from "./app.ts";
import { extractJson, normalizeResult, responseText } from "./sniff.ts";

const app = createApp({
	og: async () => new Response("png", { headers: { "content-type": "image/png" } }),
});

const fakeAi = (content: string) => ({ run: async () => ({ response: content }) }) as unknown as Ai;
const limiter = (ok: boolean) => ({ limit: async () => ({ success: ok }) }) as unknown as RateLimit;
const env = (overrides: Partial<{ AI: Ai; SNIFF_LIMITER: RateLimit }> = {}) => ({
	AI: fakeAi(
		'{"probability": 88, "verdict": "定型句だらけ", "failureStory": {"found": false, "quote": ""}, "headingLeads": [], "rewrites": []}',
	),
	SNIFF_LIMITER: limiter(true),
	...overrides,
});

describe("/api/analyze", () => {
	test("レポートを返す", async () => {
		const res = await app.request(
			"/api/analyze",
			{ method: "POST", body: JSON.stringify({ text: SAMPLE_AI }) },
			env(),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { score: number };
		expect(body.score).toBe(analyze(SAMPLE_AI).score);
	});
	test("text が無ければ 400", async () => {
		const res = await app.request("/api/analyze", { method: "POST", body: "{}" }, env());
		expect(res.status).toBe(400);
	});
});

describe("/api/sniff", () => {
	test("AI の JSON を正規化して返す", async () => {
		const res = await app.request(
			"/api/sniff",
			{ method: "POST", body: JSON.stringify({ text: SAMPLE_AI }) },
			env(),
		);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { probability: number; model: string };
		expect(body.probability).toBe(88);
		expect(body.model).toContain("qwen");
	});
	test("短すぎると 400", async () => {
		const res = await app.request(
			"/api/sniff",
			{ method: "POST", body: JSON.stringify({ text: "短い" }) },
			env(),
		);
		expect(res.status).toBe(400);
	});
	test("レート制限で 429", async () => {
		const res = await app.request(
			"/api/sniff",
			{ method: "POST", body: JSON.stringify({ text: SAMPLE_AI }) },
			env({ SNIFF_LIMITER: limiter(false) }),
		);
		expect(res.status).toBe(429);
	});
	test("AI が壊れた JSON を返すと 502", async () => {
		const res = await app.request(
			"/api/sniff",
			{ method: "POST", body: JSON.stringify({ text: SAMPLE_AI }) },
			env({ AI: fakeAi("うーん") }),
		);
		expect(res.status).toBe(502);
	});
});

describe("sniff helpers", () => {
	test("<think> とコードフェンスを剥がして JSON を取る", () => {
		const raw = '<think>考え中</think>\n```json\n{"probability": 12}\n```';
		expect(extractJson(raw)).toEqual({ probability: 12 });
	});
	test("OpenAI 互換形式も読む", () => {
		expect(responseText({ choices: [{ message: { content: "x" } }] })).toBe("x");
	});
	test("欠けたフィールドは既定値で埋める", () => {
		const r = normalizeResult({ probability: "999", rewrites: [{ before: "a" }] });
		expect(r.probability).toBe(100);
		expect(r.rewrites[0]).toEqual({ before: "a", after: "", why: "" });
		expect(r.headingLeads).toEqual([]);
	});
});

describe("share routes", () => {
	const code = encodeShare(analyze(SAMPLE_AI));
	test("/r/:code は OG タグ付き HTML", async () => {
		const res = await app.request(`/r/${code}`, {}, env());
		expect(res.status).toBe(200);
		const html = await res.text();
		expect(html).toContain(`og:image" content="http://localhost/og/${code}.png`);
		expect(html).toContain("激臭");
	});
	test("壊れたコードは 404", async () => {
		expect((await app.request("/r/zzz", {}, env())).status).toBe(404);
		expect((await app.request("/og/zzz.png", {}, env())).status).toBe(404);
		expect((await app.request(`/og/${code}.jpg`, {}, env())).status).toBe(404);
	});
	test("/og/:code.png は画像を返す", async () => {
		const res = await app.request(`/og/${code}.png`, {}, env());
		expect(res.headers.get("content-type")).toBe("image/png");
	});
});
