import { useState } from "react";
import type { SniffResult } from "../../core/index.ts";

interface Props {
	text: string;
	disabled: boolean;
}

type State =
	| { status: "idle" }
	| { status: "loading" }
	| { status: "done"; data: SniffResult }
	| { status: "error"; message: string };

export function SniffPanel({ text, disabled }: Props) {
	const [state, setState] = useState<State>({ status: "idle" });

	const run = async () => {
		setState({ status: "loading" });
		try {
			const res = await fetch("/api/sniff", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ text }),
			});
			const body = (await res.json()) as SniffResult | { error: string };
			if (!res.ok || "error" in body) {
				setState({ status: "error", message: "error" in body ? body.error : `HTTP ${res.status}` });
				return;
			}
			setState({ status: "done", data: body });
		} catch {
			setState({ status: "error", message: "通信に失敗しました" });
		}
	};

	return (
		<section className="sniff">
			<div className="section-head">
				<h2>AI 二次審査</h2>
				<p className="muted">
					静的解析で拾えない「失敗談の有無」と「見出し直後の中身」を Workers AI（Qwen3
					30B）が読む。ここだけ本文をサーバーに送ります。
				</p>
			</div>
			<button
				type="button"
				className="primary sniff-btn"
				disabled={disabled || state.status === "loading"}
				onClick={run}
			>
				{state.status === "loading" ? (
					<span className="sniffing">🐕 クンクン中</span>
				) : (
					"🐕 AI に嗅がせる"
				)}
			</button>
			{state.status === "error" && <p className="toast toast-error">{state.message}</p>}
			{state.status === "done" && <SniffResultView data={state.data} />}
		</section>
	);
}

function SniffResultView({ data }: { data: SniffResult }) {
	const hue = data.probability >= 70 ? "#ff3b6b" : data.probability >= 40 ? "#ffd23b" : "#3dffa0";
	return (
		<div className="sniff-result" style={{ "--c": hue } as React.CSSProperties}>
			<div className="sniff-prob">
				<div className="sniff-prob-num">{data.probability}%</div>
				<div className="sniff-prob-label">AI が書いた確率</div>
			</div>
			<p className="sniff-verdict">“{data.verdict}”</p>
			<dl className="sniff-grid">
				<div>
					<dt>失敗・迷い・未解決の話</dt>
					<dd>
						{data.failureStory.found ? (
							<>
								<span className="ok">あり</span> 「{data.failureStory.quote}」
							</>
						) : (
							<span className="ng">見つからない</span>
						)}
					</dd>
				</div>
				{data.headingLeads.length > 0 && (
					<div>
						<dt>見出し直後</dt>
						<dd>
							<ul className="lead-list">
								{data.headingLeads.map((l, i) => (
									<li key={i}>
										<span className={l.ok ? "ok" : "ng"}>{l.ok ? "✔" : "✘"}</span> {l.heading}
										<span className="muted"> — {l.reason}</span>
									</li>
								))}
							</ul>
						</dd>
					</div>
				)}
			</dl>
			{data.rewrites.length > 0 && (
				<div className="rewrites">
					<h3>言い換え案</h3>
					{data.rewrites.map((r, i) => (
						<div className="rewrite" key={i}>
							<div className="rewrite-before">{r.before}</div>
							<div className="rewrite-after">{r.after}</div>
							<div className="rewrite-why">{r.why}</div>
						</div>
					))}
				</div>
			)}
			<p className="muted small">model: {data.model}</p>
		</div>
	);
}
