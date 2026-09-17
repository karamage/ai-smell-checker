import { useState } from "react";
import { encodeShare, type Report } from "../../core/index.ts";

export function ShareBar({ report }: { report: Report }) {
	const [copied, setCopied] = useState(false);
	if (report.tooShort) return null;
	const code = encodeShare(report);
	const url = `${location.origin}/r/${code}`;
	const img = `/og/${code}.png`;
	const lv = report.level;
	const post = `私の文章の臭気指数は ${report.score}（Lv.${lv.index} ${lv.label}${lv.emoji}）でした。${lv.tagline}。\n#NIOU #AI臭チェッカー`;
	const intent = `https://x.com/intent/post?text=${encodeURIComponent(post)}&url=${encodeURIComponent(url)}`;

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard 不可の環境 */
		}
	};

	return (
		<section className="share">
			<div className="section-head">
				<h2>結果を晒す</h2>
				<p className="muted">共有されるのはスコアと指摘ルールだけ。本文は URL に含まれません。</p>
			</div>
			<div className="share-body">
				<a className="share-card" href={img} target="_blank" rel="noreferrer">
					<img
						src={img}
						alt={`臭気指数 ${report.score} の結果カード`}
						width={1200}
						height={630}
						loading="lazy"
					/>
				</a>
				<div className="share-actions">
					<a className="primary" href={intent} target="_blank" rel="noreferrer">
						𝕏 で晒す
					</a>
					<a className="secondary" href={img} download={`niou-${report.score}.png`}>
						画像を保存
					</a>
					<button type="button" className="secondary" onClick={copy}>
						{copied ? "コピーした ✔" : "URL をコピー"}
					</button>
					<code className="share-url">{url}</code>
				</div>
			</div>
		</section>
	);
}
