import { useEffect, useRef, useState } from "react";

/** 数値が変わったとき、前の値から滑らかにカウントアップ／ダウンする */
export function useCountUp(target: number, ms = 900): number {
	const [value, setValue] = useState(target);
	const current = useRef(target);

	useEffect(() => {
		const begin = current.current;
		const start = performance.now();
		let raf = 0;
		const tick = () => {
			const t = Math.min(1, (performance.now() - start) / ms);
			const eased = 1 - (1 - t) ** 3;
			const v = begin + (target - begin) * eased;
			current.current = v;
			setValue(v);
			if (t < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		// 非表示タブでは rAF が止まるので、時間切れ後に必ず最終値へ寄せる
		const settle = setTimeout(() => {
			cancelAnimationFrame(raf);
			current.current = target;
			setValue(target);
		}, ms + 50);
		return () => {
			cancelAnimationFrame(raf);
			clearTimeout(settle);
		};
	}, [target, ms]);

	return value;
}
