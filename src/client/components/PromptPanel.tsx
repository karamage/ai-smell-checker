import { useMemo, useState } from "react";
import { buildPrompt, type Report } from "../../core/index.ts";

/** URL に載せて外部サービスに渡せる長さの目安 */
const MAX_URL_PROMPT = 6000;

export function PromptPanel({ text, report }: { text: string; report: Report }) {
	const [copied, setCopied] = useState(false);
	const prompt = useMemo(() => buildPrompt(text, report), [text, report]);
	if (report.tooShort) return null;
	const tooLongForUrl = prompt.length > MAX_URL_PROMPT;
	const q = encodeURIComponent(prompt);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(prompt);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard 不可の環境 */
		}
	};

	return (
		<section className="prompt">
			<div className="section-head">
				<h2>AI に直させる</h2>
				<p className="muted">
					指摘をそのまま渡すと、言い換えた先で別のAI構文が発生してしまうので、指摘と「入れてはいけない表現」をセットにした制約付きプロンプトが以下
				</p>
			</div>
			<textarea
				className="prompt-text"
				value={prompt}
				readOnly
				spellCheck={false}
				onFocus={(e) => e.target.select()}
			/>
			<div className="prompt-actions">
				<button type="button" className="primary" onClick={copy}>
					{copied ? "コピーした ✔" : "プロンプトをコピー"}
				</button>
				<a
					className="secondary"
					href={tooLongForUrl ? undefined : `https://chatgpt.com/?q=${q}`}
					target="_blank"
					rel="noreferrer"
					aria-disabled={tooLongForUrl}
				>
					ChatGPT で開く
				</a>
				<a
					className="secondary"
					href={tooLongForUrl ? undefined : `https://claude.ai/new?q=${q}`}
					target="_blank"
					rel="noreferrer"
					aria-disabled={tooLongForUrl}
				>
					Claude で開く
				</a>
				<span className="muted small">
					{prompt.length.toLocaleString()} 字
					{tooLongForUrl ? "。長いのでコピーして貼り付けてください" : ""}
				</span>
			</div>
		</section>
	);
}
