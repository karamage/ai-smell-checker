import { type Finding, RULES, type RuleId } from "../../core/index.ts";

interface Props {
	findings: Finding[];
	filter: RuleId | null;
	activeIndex: number | null;
	onPick: (index: number) => void;
	onClearFilter: () => void;
}

export function Findings({ findings, filter, activeIndex, onPick, onClearFilter }: Props) {
	const items = findings
		.map((f, index) => ({ f, index }))
		.filter((x) => !filter || x.f.ruleId === filter);
	if (findings.length === 0) return null;
	return (
		<section className="findings" id="findings">
			<div className="section-head">
				<h2>
					臭う箇所 <span className="count">{items.length}</span>
				</h2>
				{filter && (
					<button type="button" className="ghost" onClick={onClearFilter}>
						{RULES[filter].name} の絞り込みを解除
					</button>
				)}
			</div>
			<ul className="finding-list">
				{items.map(({ f, index }) => (
					<li key={index}>
						<button
							type="button"
							className={`finding sev-${f.severity}${index === activeIndex ? " finding-active" : ""}${f.range ? "" : " finding-doc"}`}
							style={{ "--c": RULES[f.ruleId].color } as React.CSSProperties}
							onClick={() => f.range && onPick(index)}
						>
							<div className="finding-top">
								<span className="chip">{RULES[f.ruleId].name}</span>
								{!f.range && <span className="chip chip-doc">文書全体</span>}
								<span className="finding-msg">{f.message}</span>
							</div>
							{f.excerpt && <div className="finding-excerpt">{f.excerpt}</div>}
							<div className="finding-hint">→ {f.hint}</div>
						</button>
					</li>
				))}
			</ul>
		</section>
	);
}
