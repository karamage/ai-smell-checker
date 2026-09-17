import { describe, expect, test } from "bun:test";
import { analyze, encodeShare } from "../core/index.ts";
import { SAMPLE_AI } from "../core/samples.ts";
import { createApp } from "./app.ts";

const app = createApp({
	og: async () => new Response("png", { headers: { "content-type": "image/png" } }),
});

const env = () => ({});

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
