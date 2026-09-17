import { useMemo, useState } from "react";
import { analyze, type RuleId } from "../core/index.ts";
import { SAMPLE_AI, SAMPLE_HUMAN } from "../core/samples.ts";
import { Checklist } from "./components/Checklist.tsx";
import { Editor } from "./components/Editor.tsx";
import { Findings } from "./components/Findings.tsx";
import { Meter } from "./components/Meter.tsx";
import { PromptPanel } from "./components/PromptPanel.tsx";
import { ShareBar } from "./components/ShareBar.tsx";
import { SmokeCanvas } from "./components/SmokeCanvas.tsx";
import { useDebounce } from "./hooks/useDebounce.ts";

const REPO = "https://github.com/karamage/ai-smell-checker";

export function App() {
	const [text, setText] = useState("");
	const [active, setActive] = useState<number | null>(null);
	const [filter, setFilter] = useState<RuleId | null>(null);
	const debounced = useDebounce(text, 250);
	const report = useMemo(() => analyze(debounced), [debounced]);
	const intensity = report.tooShort ? 0.04 : 0.08 + (report.score / 100) * 0.92;

	const pick = (i: number | null) => {
		setActive(i);
	};

	const load = (sample: string) => {
		setText(sample);
		setActive(null);
		setFilter(null);
	};

	return (
		<>
			<SmokeCanvas intensity={intensity} color={report.tooShort ? "#7c3aed" : report.level.color} />
			<div
				className="page"
				style={
					{ "--level": report.tooShort ? "#7c3aed" : report.level.color } as React.CSSProperties
				}
			>
				<header className="hero">
					<div className="hero-top">
						<a className="repo" href={REPO} target="_blank" rel="noreferrer">
							GitHub ★
						</a>
					</div>
					<h1 className="logo">
						<span className="logo-nose">👃</span>NIOU
					</h1>
					<p className="hero-copy">その文章、AI臭くない？</p>
					<p className="hero-sub">
						貼るだけで「AI が書いた感」の出る箇所を炙り出す。
						<br />
						本文はブラウザ内で解析、サーバーには送らない。
					</p>
					<ul className="badges">
						<li>静的解析 10 ルール</li>
						<li>本文はブラウザから出ない</li>
						<li>結果カードを 1 秒で共有</li>
						<li>AI に直させる制約付きプロンプト</li>
					</ul>
				</header>

				<main>
					<section className="workbench">
						<div className="editor-col">
							<div className="toolbar">
								<button type="button" className="secondary" onClick={() => load(SAMPLE_AI)}>
									☠️ AI 臭いサンプル
								</button>
								<button type="button" className="secondary" onClick={() => load(SAMPLE_HUMAN)}>
									🌿 人間のサンプル
								</button>
								<button
									type="button"
									className="ghost"
									onClick={() => load("")}
									disabled={text === ""}
								>
									クリア
								</button>
								<span className="chars">{report.length.toLocaleString()} 字</span>
							</div>
							<Editor
								text={text}
								findings={report.findings}
								activeIndex={active}
								onChange={setText}
								onPick={pick}
							/>
						</div>
						<aside className="side">
							<Meter report={report} />
							<Checklist report={report} filter={filter} onFilter={setFilter} />
						</aside>
					</section>

					<Findings
						findings={report.findings}
						filter={filter}
						activeIndex={active}
						onPick={(i) => {
							pick(i);
							document
								.querySelector(".editor")
								?.scrollIntoView({ behavior: "smooth", block: "center" });
						}}
						onClearFilter={() => setFilter(null)}
					/>

					<PromptPanel text={debounced} report={report} />
					<ShareBar report={report} />
				</main>

				<footer>
					<p className="footer-line">
						NIOU は Cloudflare Workers の上で Hono + React で動いています。
						<a href={REPO} target="_blank" rel="noreferrer">
							ソースコード
						</a>
					</p>
					<p className="muted small">
						判定はヒューリスティックです。人間が書いた名文も普通に激臭判定されます。
					</p>
				</footer>
			</div>
		</>
	);
}
