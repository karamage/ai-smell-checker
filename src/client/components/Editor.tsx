import { useEffect, useMemo, useRef } from "react";
import { type Finding, RULES } from "../../core/index.ts";

interface Props {
	text: string;
	findings: Finding[];
	activeIndex: number | null;
	onChange: (text: string) => void;
	onPick: (index: number | null) => void;
}

interface Seg {
	text: string;
	index: number | null;
}

/** 重なった範囲は先勝ちで捨て、テキストをマーク区間に分ける */
function segment(text: string, findings: Finding[]): Seg[] {
	const ranged = findings
		.map((f, index) => ({ f, index }))
		.filter(
			(x): x is { f: Finding & { range: NonNullable<Finding["range"]> }; index: number } =>
				x.f.range !== null,
		)
		.toSorted((a, b) => a.f.range.start - b.f.range.start || b.f.range.end - a.f.range.end);
	const segs: Seg[] = [];
	let cursor = 0;
	for (const { f, index } of ranged) {
		if (f.range.start < cursor) continue;
		if (f.range.start > cursor) segs.push({ text: text.slice(cursor, f.range.start), index: null });
		segs.push({ text: text.slice(f.range.start, f.range.end), index });
		cursor = f.range.end;
	}
	if (cursor < text.length) segs.push({ text: text.slice(cursor), index: null });
	return segs;
}

export function Editor({ text, findings, activeIndex, onChange, onPick }: Props) {
	const ta = useRef<HTMLTextAreaElement>(null);
	const bd = useRef<HTMLDivElement>(null);
	const segs = useMemo(() => segment(text, findings), [text, findings]);

	const sync = () => {
		if (ta.current && bd.current) {
			bd.current.scrollTop = ta.current.scrollTop;
			bd.current.scrollLeft = ta.current.scrollLeft;
		}
	};

	useEffect(() => {
		if (activeIndex === null || !ta.current || !bd.current) return;
		const mark = bd.current.querySelector<HTMLElement>(`[data-i="${activeIndex}"]`);
		if (!mark) return;
		const top = mark.offsetTop - ta.current.clientHeight / 2 + mark.offsetHeight / 2;
		ta.current.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
		const f = findings[activeIndex];
		if (f?.range) {
			ta.current.setSelectionRange(f.range.start, f.range.end);
		}
	}, [activeIndex, findings]);

	return (
		<div className="editor">
			<div ref={bd} className="editor-backdrop" aria-hidden="true">
				{segs.map((s, i) =>
					s.index === null ? (
						<span key={i}>{s.text}</span>
					) : (
						<mark
							key={i}
							data-i={s.index}
							className={`hl${s.index === activeIndex ? " hl-active" : ""}`}
							style={
								{ "--c": RULES[findings[s.index]?.ruleId ?? "R0"].color } as React.CSSProperties
							}
						>
							{s.text}
						</mark>
					),
				)}
				{"\n"}
			</div>
			<textarea
				ref={ta}
				className="editor-textarea"
				value={text}
				placeholder={
					"ここに文章を貼り付けてください。\n貼った瞬間に鼻が動きます。本文はブラウザから出ません。"
				}
				spellCheck={false}
				onChange={(e) => {
					onPick(null);
					onChange(e.target.value);
				}}
				onScroll={sync}
				onClick={() => {
					const pos = ta.current?.selectionStart ?? -1;
					const hit = findings.findIndex(
						(f) => f.range && pos >= f.range.start && pos <= f.range.end,
					);
					onPick(hit >= 0 ? hit : null);
				}}
			/>
		</div>
	);
}
