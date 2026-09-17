import type { Report } from "../../core/index.ts";
import { useCountUp } from "../hooks/useCountUp.ts";

const R = 82;
const LEN = Math.PI * R;

export function Meter({ report }: { report: Report }) {
	const shown = useCountUp(report.tooShort ? 0 : report.score);
	const ratio = Math.max(0, Math.min(1, shown / 100));
	const lv = report.level;
	const color = report.tooShort ? "#4a4f6e" : lv.color;
	return (
		<div className="meter" style={{ "--level": color } as React.CSSProperties}>
			<svg
				viewBox="0 0 200 118"
				className="meter-svg"
				role="img"
				aria-label={`臭気指数 ${report.score}`}
			>
				<defs>
					<filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation="4" result="b" />
						<feMerge>
							<feMergeNode in="b" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>
				<path d={`M 18 100 A ${R} ${R} 0 0 1 182 100`} className="meter-track" />
				<path
					d={`M 18 100 A ${R} ${R} 0 0 1 182 100`}
					className="meter-arc"
					style={{ strokeDasharray: LEN, strokeDashoffset: LEN * (1 - ratio) }}
					filter="url(#glow)"
				/>
				{[0, 15, 35, 55, 75].map((s) => {
					const a = Math.PI * (1 - s / 100);
					const x1 = 100 + Math.cos(a) * (R - 12);
					const y1 = 100 - Math.sin(a) * (R - 12);
					const x2 = 100 + Math.cos(a) * (R - 6);
					const y2 = 100 - Math.sin(a) * (R - 6);
					return <line key={s} x1={x1} y1={y1} x2={x2} y2={y2} className="meter-tick" />;
				})}
			</svg>
			<div className="meter-value">
				<div className="meter-number">{report.tooShort ? "--" : Math.round(shown)}</div>
				<div className="meter-unit">臭気指数 / 100</div>
			</div>
			<div className="meter-level">
				{report.tooShort ? (
					<>
						<div className="meter-emoji">🫥</div>
						<div className="meter-label">未計測</div>
						<div className="meter-tagline">100 字以上でセンサーが反応します</div>
					</>
				) : (
					<>
						<div className="meter-emoji">{lv.emoji}</div>
						<div className="meter-label">
							Lv.{lv.index} {lv.label}
						</div>
						<div className="meter-tagline">{lv.tagline}</div>
					</>
				)}
			</div>
		</div>
	);
}
