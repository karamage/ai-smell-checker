import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyze, decodeShare, type ShareData } from "../core/index.ts";
import { sharePage } from "./share-page.ts";
import { SNIFF_MAX_CHARS, sniff } from "./sniff.ts";

export interface Bindings {
	AI: Ai;
	SNIFF_LIMITER: RateLimit;
	ASSETS?: Fetcher;
}

/** OG 画像生成は wasm を含むので、テストしやすいよう差し替え可能にしておく */
export interface AppDeps {
	og: (data: ShareData) => Promise<Response>;
}

export function createApp(deps: AppDeps) {
	const app = new Hono<{ Bindings: Bindings }>();

	app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST", "OPTIONS"] }));

	app.get("/api/health", (c) => c.json({ ok: true, name: "niou" }));

	// 静的解析。ブラウザ内で完結するが、CLI や他ツールから叩けるように公開しておく
	app.post("/api/analyze", async (c) => {
		const body = await c.req.json<{ text?: unknown }>().catch(() => null);
		const text = typeof body?.text === "string" ? body.text : null;
		if (text === null) return c.json({ error: "text (string) が必要です" }, 400);
		if (text.length > 100_000) return c.json({ error: "100,000 字までです" }, 413);
		return c.json(analyze(text));
	});

	// Workers AI による二次審査
	app.post("/api/sniff", async (c) => {
		const body = await c.req.json<{ text?: unknown }>().catch(() => null);
		const text = typeof body?.text === "string" ? body.text.trim() : "";
		if (text.length < 100) return c.json({ error: "100 字以上の文章を入れてください" }, 400);
		if (text.length > SNIFF_MAX_CHARS) {
			return c.json({ error: `AI 審査は ${SNIFF_MAX_CHARS.toLocaleString()} 字までです` }, 413);
		}
		const ip = c.req.header("cf-connecting-ip") ?? "anon";
		const { success } = await c.env.SNIFF_LIMITER.limit({ key: ip });
		if (!success) return c.json({ error: "嗅ぎすぎです。1 分ほど鼻を休ませてください" }, 429);
		try {
			const result = await sniff(c.env.AI, text, analyze(text));
			return c.json(result);
		} catch (err) {
			console.error("sniff failed", err);
			return c.json({ error: "AI の鼻が詰まりました。少し待ってもう一度どうぞ" }, 502);
		}
	});

	app.get("/r/:code", (c) => {
		const data = decodeShare(c.req.param("code"));
		if (!data) return c.text("Not Found", 404);
		const origin = new URL(c.req.url).origin;
		c.header("Cache-Control", "public, max-age=3600");
		return c.html(sharePage(c.req.param("code"), data, origin));
	});

	app.get("/og/:file", async (c) => {
		const file = c.req.param("file");
		if (!file.endsWith(".png")) return c.text("Not Found", 404);
		const data = decodeShare(file.slice(0, -4));
		if (!data) return c.text("Not Found", 404);
		return deps.og(data);
	});

	app.notFound(async (c) => {
		if (c.env.ASSETS) return c.env.ASSETS.fetch(c.req.raw);
		return c.text("Not Found", 404);
	});

	return app;
}
