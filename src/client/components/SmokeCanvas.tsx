import { useEffect, useRef } from "react";

interface Particle {
	x: number;
	y: number;
	r: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
}

interface Props {
	/** 0〜1。煙の濃さ */
	intensity: number;
	color: string;
}

function hexToRgb(hex: string): [number, number, number] {
	const n = Number.parseInt(hex.slice(1), 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 画面奥で漂う煙。臭気指数が高いほど濃く、速くなる */
export function SmokeCanvas({ intensity, color }: Props) {
	const ref = useRef<HTMLCanvasElement>(null);
	const state = useRef({ intensity, color });
	useEffect(() => {
		state.current = { intensity, color };
	}, [intensity, color]);

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const particles: Particle[] = [];
		let raf = 0;
		let w = 0;
		let h = 0;
		let last = performance.now();

		const resize = () => {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			w = window.innerWidth;
			h = window.innerHeight;
			canvas.width = w * dpr;
			canvas.height = h * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		resize();
		window.addEventListener("resize", resize);

		const spawn = () => {
			const r = 60 + Math.random() * 140;
			particles.push({
				x: Math.random() * w,
				y: h + r,
				r,
				vx: (Math.random() - 0.5) * 12,
				vy: -(18 + Math.random() * 30),
				life: 0,
				max: 9 + Math.random() * 6,
			});
		};

		const frame = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			const { intensity: k, color: c } = state.current;
			const [cr, cg, cb] = hexToRgb(c);
			const target = Math.round(4 + k * 70);
			if (particles.length < target && Math.random() < 0.25 + k) spawn();

			ctx.clearRect(0, 0, w, h);
			ctx.globalCompositeOperation = "lighter";
			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i] as Particle;
				p.life += dt;
				const speed = 0.6 + k * 1.6;
				p.x += (p.vx + Math.sin(p.life * 1.3 + p.r) * 10) * dt * speed;
				p.y += p.vy * dt * speed;
				p.r += 8 * dt;
				const t = p.life / p.max;
				if (t >= 1 || p.y + p.r < 0 || particles.length > target + 10) {
					particles.splice(i, 1);
					continue;
				}
				const alpha = Math.sin(t * Math.PI) * (0.05 + k * 0.14);
				const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
				g.addColorStop(0, `rgba(${cr},${cg},${cb},${alpha})`);
				g.addColorStop(0.5, `rgba(124,58,237,${alpha * 0.5})`);
				g.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalCompositeOperation = "source-over";
			if (!reduced) raf = requestAnimationFrame(frame);
		};
		raf = requestAnimationFrame(frame);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", resize);
		};
	}, []);

	return <canvas ref={ref} className="smoke" />;
}
