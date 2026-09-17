import { type Report, RULE_IDS, RULES, type RuleId } from "../../core/index.ts";

interface Props {
	report: Report;
	filter: RuleId | null;
	onFilter: (id: RuleId | null) => void;
}

export function Checklist({ report, filter, onFilter }: Props) {
	return (
		<ol className="checklist">
			{RULE_IDS.map((id) => {
				const n = report.counts[id];
				const skipped = report.skipped.includes(id) || report.tooShort;
				const status = skipped ? "skip" : n === 0 ? "ok" : "ng";
				const active = filter === id;
				return (
					<li key={id} className={`check check-${status}${active ? " check-active" : ""}`}>
						<button
							type="button"
							className="check-btn"
							disabled={status !== "ng"}
							onClick={() => onFilter(active ? null : id)}
							style={{ "--c": RULES[id].color } as React.CSSProperties}
						>
							<span className="check-mark">
								{status === "ok" ? "✔" : status === "ng" ? "✘" : "－"}
							</span>
							<span className="check-text">{RULES[id].checklist}</span>
							{n > 0 && <span className="check-count">×{n}</span>}
						</button>
					</li>
				);
			})}
		</ol>
	);
}
