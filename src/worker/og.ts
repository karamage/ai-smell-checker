import { ImageResponse, loadGoogleFont } from "workers-og";
import { RULES, type ShareData } from "../core/index.ts";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Google Fonts のサブセットを Cache API に載せて取得する */
async function font(family: string, weight: number, text: string): Promise<ArrayBuffer> {
	const key = new Request(
		`https://niou.font.cache/${encodeURIComponent(family)}/${weight}/${encodeURIComponent(text)}`,
	);
	const cache = caches.default;
	const hit = await cache.match(key);
	if (hit) return hit.arrayBuffer();
	const data = await loadGoogleFont({ family, weight, text });
	await cache.put(
		key,
		new Response(data, { headers: { "Cache-Control": "public, max-age=604800" } }),
	);
	return data;
}

export function ogCardHtml(data: ShareData): string {
	const { score, level, rules, count } = data;
	const chips = rules
		.slice(0, 6)
		.map(
			(id) =>
				`<div style="display:flex;border:2px solid ${RULES[id].color};color:${RULES[id].color};border-radius:999px;padding:6px 18px;font-size:22px;font-weight:700">${esc(RULES[id].name)}</div>`,
		)
		.join("");
	const more =
		rules.length > 6
			? `<div style="display:flex;color:#8b90b3;font-size:22px;padding:6px 8px">ほか ${rules.length - 6}</div>`
			: "";
	return `
<div style="display:flex;width:1200px;height:630px;background:#07080f;color:#eef0ff;font-family:'Zen Kaku Gothic New';position:relative;overflow:hidden">
  <div style="display:flex;position:absolute;left:-200px;top:-260px;width:900px;height:900px;border-radius:900px;background:${level.color};opacity:0.16"></div>
  <div style="display:flex;position:absolute;right:-300px;bottom:-400px;width:800px;height:800px;border-radius:800px;background:#7c3aed;opacity:0.2"></div>
  <div style="display:flex;flex-direction:column;justify-content:center;width:520px;padding:56px 0 56px 72px">
    <div style="display:flex;font-family:'Dela Gothic One';font-size:26px;letter-spacing:8px;color:#8b90b3">NIOU</div>
    <div style="display:flex;font-size:24px;color:#8b90b3;margin-top:4px">AI臭い文章チェッカー</div>
    <div style="display:flex;align-items:flex-end;margin-top:28px">
      <div style="display:flex;font-family:'Dela Gothic One';font-size:200px;line-height:1;color:${level.color}">${score}</div>
      <div style="display:flex;font-size:32px;color:#8b90b3;margin:0 0 22px 12px">/100</div>
    </div>
    <div style="display:flex;font-size:26px;color:#8b90b3;margin-top:8px">臭気指数</div>
  </div>
  <div style="display:flex;flex-direction:column;justify-content:center;flex:1;padding:56px 72px 56px 24px">
    <div style="display:flex;align-items:center">
      <div style="display:flex;font-size:96px">${level.emoji}</div>
      <div style="display:flex;font-family:'Dela Gothic One';font-size:88px;color:${level.color};margin-left:20px">${esc(level.label)}</div>
    </div>
    <div style="display:flex;font-size:34px;color:#eef0ff;margin-top:8px">${esc(level.tagline)}</div>
    <div style="display:flex;font-size:26px;color:#8b90b3;margin-top:20px">指摘 ${count} 件</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px;max-width:520px">${chips}${more}</div>
  </div>
</div>`;
}

export async function ogImage(data: ShareData): Promise<Response> {
	const htmlStr = ogCardHtml(data);
	const textForSubset = htmlStr.replace(/<[^>]+>/g, "");
	const [jpBold, jpRegular, display] = await Promise.all([
		font("Zen Kaku Gothic New", 700, textForSubset),
		font("Zen Kaku Gothic New", 400, textForSubset),
		font("Dela Gothic One", 400, "0123456789NIOU無臭微匂う臭い激"),
	]);
	const res = new ImageResponse(htmlStr, {
		width: 1200,
		height: 630,
		emoji: "twemoji",
		fonts: [
			{ name: "Zen Kaku Gothic New", data: jpBold, weight: 700, style: "normal" },
			{ name: "Zen Kaku Gothic New", data: jpRegular, weight: 400, style: "normal" },
			{ name: "Dela Gothic One", data: display, weight: 400, style: "normal" },
		],
	});
	res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
	return res;
}
