import { html, raw } from "hono/html";
import { RULES, type ShareData } from "../core/index.ts";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function sharePage(code: string, data: ShareData, origin: string) {
	const { score, level, rules, count } = data;
	const title = `臭気指数 ${score} ${level.label}${level.emoji} | NIOU`;
	const desc = `AI臭い文章チェッカー NIOU の診断結果。指摘 ${count} 件。${level.tagline}。`;
	const image = `${origin}/og/${code}.png`;
	const chips = rules
		.map((id) => {
			const r = RULES[id];
			return `<span class="chip" style="--c:${r.color}">${esc(r.name)}</span>`;
		})
		.join("");
	return html`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:image" content="${image}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:url" content="${origin}/r/${code}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<meta name="twitter:image" content="${image}" />
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>👃</text></svg>" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Zen+Kaku+Gothic+New:wght@400;700&display=swap" rel="stylesheet" />
<style>
:root{--bg:#07080f;--fg:#eef0ff;--muted:#8b90b3;--accent:#b6ff3b;--level:${level.color}}
*{box-sizing:border-box}
body{margin:0;background:radial-gradient(1200px 600px at 50% -10%,color-mix(in oklab,var(--level) 18%,transparent),transparent 60%),var(--bg);color:var(--fg);font-family:"Zen Kaku Gothic New",system-ui,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px 16px}
.card{width:min(720px,100%);text-align:center}
.brand{font-family:"Dela Gothic One",sans-serif;font-size:14px;letter-spacing:.3em;color:var(--muted)}
.score{font-family:"Dela Gothic One",sans-serif;font-size:clamp(96px,22vw,180px);line-height:1;color:var(--level);text-shadow:0 0 40px color-mix(in oklab,var(--level) 60%,transparent);margin:12px 0 0}
.level{font-family:"Dela Gothic One",sans-serif;font-size:clamp(28px,6vw,44px);margin:4px 0 0}
.tag{color:var(--muted);margin:8px 0 20px}
.chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:0 0 28px}
.chip{border:1px solid var(--c);color:var(--c);border-radius:999px;padding:4px 12px;font-size:13px;font-weight:700}
img{width:100%;border-radius:16px;border:1px solid #1e2138;box-shadow:0 20px 60px #0009}
.cta{display:inline-block;margin-top:28px;background:var(--accent);color:#07080f;font-weight:700;padding:14px 28px;border-radius:999px;text-decoration:none;font-size:16px}
.cta:hover{filter:brightness(1.1)}
.note{color:var(--muted);font-size:12px;margin-top:16px}
</style>
</head>
<body>
<main class="card">
<div class="brand">NIOU / AI臭い文章チェッカー</div>
<p class="score">${score}</p>
<p class="level">${level.emoji} ${level.label}</p>
<p class="tag">${level.tagline}。指摘 ${count} 件</p>
<div class="chips">${raw(chips)}</div>
<img src="${image}" alt="臭気指数 ${score} の結果カード" width="1200" height="630" />
<a class="cta" href="/">自分の文章も嗅いでもらう →</a>
<p class="note">本文はサーバーに保存されません。共有されるのはスコアと指摘ルールだけです。</p>
</main>
</body>
</html>`;
}
