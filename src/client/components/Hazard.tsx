import { useEffect, useMemo } from "react";

/** 演出の長さ（ms）。CSS のアニメーション時間と合わせる */
export const HAZARD_DURATION = 4200;
const SKULLS = 36;

interface Props {
	/** true になった瞬間に一度だけ再生する */
	active: boolean;
	onDone: () => void;
}

/** 臭気指数 100 のときだけ出る警報演出。ハンコ、☠️ の雨、赤いビネット */
export function Hazard({ active, onDone }: Props) {
	const skulls = useMemo(
		() =>
			Array.from({ length: SKULLS }, (_, i) => ({
				left: `${(i * 37 + 11) % 100}%`,
				delay: `${((i * 53) % 100) / 100}s`,
				duration: `${2.6 + ((i * 29) % 100) / 80}s`,
				size: `${22 + ((i * 17) % 100) / 5}px`,
				spin: `${((i * 71) % 2 ? 1 : -1) * (180 + ((i * 13) % 360))}deg`,
			})),
		[],
	);

	useEffect(() => {
		if (!active) return;
		const id = setTimeout(onDone, HAZARD_DURATION);
		return () => clearTimeout(id);
	}, [active, onDone]);

	if (!active) return null;
	return (
		<div className="hazard" aria-hidden="true">
			<div className="hazard-vignette" />
			<div className="hazard-stripes" />
			{skulls.map((s, i) => (
				<span
					key={i}
					className="hazard-skull"
					style={
						{
							left: s.left,
							animationDelay: s.delay,
							animationDuration: s.duration,
							fontSize: s.size,
							"--spin": s.spin,
						} as React.CSSProperties
					}
				>
					☠️
				</span>
			))}
			<div className="hazard-stamp">
				<div className="hazard-stamp-top">臭気指数 100 / 100</div>
				<div className="hazard-stamp-main">AI 生成物</div>
				<div className="hazard-stamp-sub">認 定</div>
			</div>
		</div>
	);
}
