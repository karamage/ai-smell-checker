import { Hono } from "hono";
import { cors } from "hono/cors";
import { analyze, decodeShare, type ShareData } from "../core/index.ts";
import { sharePage } from "./share-page.ts";

export interface Bindings {
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
