import { describe, expect, test } from "bun:test";
import { buildContext } from "../segment.ts";
import type { RuleId } from "../types.ts";
import { RULE_IMPL } from "./index.ts";

const run = (id: RuleId, text: string) => RULE_IMPL[id](buildContext(text));

describe("R0 禁止ワード", () => {
	test("常套句を範囲付きで拾う", () => {
		const text = "本記事では Workers について解説します。いかがでしたか？";
		const f = run("R0", text);
		expect(f.map((x) => x.excerpt.length > 0)).not.toContain(false);
		const words = f.map((x) => text.slice(x.range?.start, x.range?.end));
		expect(words).toContain("本記事では");
		expect(words).toContain("について解説します");
		expect(words).toContain("いかがでしたか");
	});
	test("コードブロック内は無視する", () => {
		expect(run("R0", "```\nいかがでしたか\n```")).toHaveLength(0);
	});
	test("何もなければ空", () => {
		expect(run("R0", "昨日ラーメンを食べた。うまかった。")).toHaveLength(0);
	});
	test("追加の禁止ワード（ダッシュ、✅、枕詞、効く、気づき、核心）", () => {
		const text =
			"前段。\n\n---\n\n正直言うと、結論から言えば効いた。先に白状すると気づきがあった。核心はここだ。✅️ 完了";
		const words = run("R0", text).map((x) => text.slice(x.range?.start, x.range?.end));
		expect(words).toContain("---");
		expect(words).toContain("正直言う");
		expect(words).toContain("結論から言え");
		expect(words).toContain("効いた");
		expect(words).toContain("先に白状");
		expect(words).toContain("気づき");
		expect(words).toContain("核心");
		expect(words.some((w) => w.startsWith("✅"))).toBe(true);
	});
	test("「効果」や「核心的」以外の語は誤検知しない", () => {
		expect(run("R0", "効果を測った。")).toHaveLength(0);
	});
});

describe("R1 です・ます連打", () => {
	test("同じ文末が 3 連続で指摘", () => {
		const f = run("R1", "これはペンです。あれは本です。それは机です。");
		expect(f).toHaveLength(1);
		expect(f[0]?.message).toContain("3 連続");
		expect(f[0]?.range).toEqual({ start: 0, end: 22 });
	});
	test("です・ます交互は指摘しない", () => {
		expect(run("R1", "これはペンです。書きます。それは机です。読みます。")).toHaveLength(0);
	});
	test("2 連続は指摘しない", () => {
		expect(run("R1", "これはペンです。あれは本です。それは机だ。")).toHaveLength(0);
	});
	test("段落をまたいでも数える", () => {
		expect(run("R1", "行きます。\n\n見ます。\n\n寝ます。")).toHaveLength(1);
	});
	test("見出しを挟んだら連続とみなさない", () => {
		expect(run("R1", "行きます。\n\n## 見出し\n\n見ます。寝ます。")).toHaveLength(0);
	});
});

describe("R2 箇条書き", () => {
	test("3 項目以上の連続ブロックを指摘", () => {
		const f = run("R2", "前置き。\n- a\n- b\n- c\n後書き。");
		expect(f).toHaveLength(1);
		expect(f[0]?.message).toContain("3 項目");
	});
	test("2 項目なら指摘しない", () => {
		expect(run("R2", "- a\n- b\n\n本文")).toHaveLength(0);
	});
	test("番号付きや中黒も箇条書き扱い", () => {
		expect(run("R2", "1. a\n2. b\n3. c\n4. d")).toHaveLength(1);
		expect(run("R2", "・a\n・b\n・c")).toHaveLength(1);
	});
});

describe("R3 逃げの断定", () => {
	test("両方の型を拾う", () => {
		const f = run("R3", "速いと言えるでしょう。安いのではないでしょうか。");
		expect(f.map((x) => x.excerpt)).toHaveLength(2);
		expect(f[0]?.severity).toBe("high");
	});
	test("ひらがな表記も拾う", () => {
		expect(run("R3", "速いといえるだろう。")).toHaveLength(1);
	});
});

describe("R4 段落の均一さ", () => {
	const p = (n: number) => "あ".repeat(n);
	test("全段落が同じ長さなら指摘", () => {
		const text = [p(120), p(118), p(122), p(119)].join("\n\n");
		expect(run("R4", text)).toHaveLength(1);
	});
	test("短い段落と長い段落が混在すれば OK", () => {
		const text = [p(20), p(160), p(60), p(15)].join("\n\n");
		expect(run("R4", text)).toHaveLength(0);
	});
	test("段落が 2 つ以下なら評価しない", () => {
		expect(run("R4", [p(100), p(100)].join("\n\n"))).toHaveLength(0);
	});
});

describe("R5 順序接続詞", () => {
	test("まず・次に・最後にで始まる段落を指摘", () => {
		const f = run("R5", "まず、準備する。\n\n次に、実行する。\n\n最後に、片付ける。");
		expect(f).toHaveLength(3);
		expect(f[0]?.range).toEqual({ start: 0, end: 2 });
	});
	test("文中の「まず」は指摘しない", () => {
		expect(run("R5", "朝はまずコーヒーを飲む。")).toHaveLength(0);
	});
});

describe("R6 失敗談", () => {
	test("失敗語彙がなければ指摘", () => {
		expect(run("R6", "全部うまくいった。最高だった。")).toHaveLength(1);
	});
	test("あれば指摘しない", () => {
		expect(run("R6", "設定でハマった。まだ解決していない。")).toHaveLength(0);
	});
});

describe("R7 主語", () => {
	test("主語がなければ指摘", () => {
		expect(run("R7", "Workers は速い。")).toHaveLength(1);
	});
	test("あれば指摘しない", () => {
		expect(run("R7", "自分は Workers が好きだ。")).toHaveLength(0);
		expect(run("R7", "このブログでは毎週書く。")).toHaveLength(0);
		expect(run("R7", "私たちのチームは。")).toHaveLength(1);
	});
});

describe("R8 口語の繰り返し", () => {
	test("2 回目以降だけを指摘", () => {
		const f = run("R8", "正直つらい。でも正直楽しい。正直。");
		expect(f).toHaveLength(2);
		expect(f[0]?.message).toContain("2 回目");
		expect(f[1]?.message).toContain("3 回目");
	});
	test("1 回なら指摘しない", () => {
		expect(run("R8", "ぶっちゃけ最高。")).toHaveLength(0);
	});
});

describe("R9 見出し直後", () => {
	test("「〜とは〜のことです」型の説明を指摘", () => {
		const f = run("R9", "## Workers とは\n\nWorkers とは、エッジで動く実行環境のことです。速い。");
		expect(f).toHaveLength(1);
		expect(f[0]?.excerpt).toContain("のことです");
	});
	test("「〜について解説します」も指摘", () => {
		expect(run("R9", "## 設定\n\nここでは設定方法について解説します。")).toHaveLength(1);
	});
	test("結論や具体例から始まれば OK", () => {
		expect(run("R9", "## 結果\n\np50 が 38ms になった。理由は距離だ。")).toHaveLength(0);
	});
	test("Markdown でない短い行も見出しとみなす", () => {
		expect(run("R9", "導入の背景\n\n本節では背景を説明します。")).toHaveLength(1);
	});
});
