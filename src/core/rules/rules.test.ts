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
	test("追加の禁止語（本質的に・視座・羅針盤・解像度を上げる など）", () => {
		const text =
			"本質的に大事だ。視座を変える。読者の皆さんへ。受け皿を作る。種をまく。出血が続く。解像度を上げる。文脈次第だ。余白がある。というものです。改善していきます。問いを立てる。構造を見る。要するに。";
		const words = run("R0", text).map((x) => text.slice(x.range?.start, x.range?.end));
		for (const w of [
			"本質的に",
			"視座",
			"読者の皆さん",
			"受け皿",
			"種をまく",
			"出血",
			"解像度を上げ",
			"文脈",
			"余白",
			"というものです",
			"していきます",
			"問い",
			"構造",
			"要するに",
		]) {
			expect(words).toContain(w);
		}
	});
	test("問い合わせ・データ構造・構造体は拾わない", () => {
		expect(run("R0", "問い合わせが来た。データ構造を選ぶ。構造体を定義する。")).toHaveLength(0);
	});
	test("「解説していきます」を二重に数えない", () => {
		expect(run("R0", "使い方を解説していきます。")).toHaveLength(1);
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

describe("R10 リズム", () => {
	const flat = Array.from(
		{ length: 8 },
		(_, i) => `これは${i}番目の文で長さがほぼ同じになっている。`,
	).join("");
	test("文長がほぼ一定なら重い指摘", () => {
		const f = run("R10", flat);
		expect(f.some((x) => x.severity === "high" && x.message.includes("ほぼ一定"))).toBe(true);
	});
	test("長短が混ざっていれば文長の指摘は出ない", () => {
		const text =
			"短い。ここは長めの文にして、読点も入れながら、ひとつの段落の中で文の長さを大きく変えてみる必要がある。うん。それで良い。次はまた少し長い文を置いて、リズムを崩す。終わり。";
		expect(run("R10", text).filter((x) => x.range === null)).toHaveLength(0);
	});
	test("同じ型の文末が 5 連続で指摘（です・ます以外）", () => {
		const text =
			"短い。長めの文をここに置いた。走った。見た。食べた。寝た。とても長い文をもう一つ置いてリズムを作っておく。";
		const f = run("R10", text).filter((x) => x.message.includes("連続"));
		expect(f).toHaveLength(1);
		expect(f[0]?.message).toContain("「〜た」");
	});
	test("た形が 4 連続までなら指摘しない", () => {
		const text =
			"短い。長めの文をここに置いた。走った。見た。食べた。とても長い文をもう一つ置いてリズムを作っておく。";
		expect(run("R10", text).filter((x) => x.message.includes("連続"))).toHaveLength(0);
	});
	test("同じ文頭が 5 回で指摘", () => {
		const text =
			"また来た。また今日も長い文を書いてしまって反省している。また。また明日にしよう。また来週も来るつもりだ。ここで少し長めの文を置いてリズムを作っておく。";
		const f = run("R10", text).filter((x) => x.message.includes("で始まる文"));
		expect(f).toHaveLength(1);
		expect(f[0]?.message).toContain("「また」");
	});
	test("文が 5 つ以下なら評価しない", () => {
		expect(run("R10", "同じ。同じ。同じ。同じ。同じ。")).toHaveLength(0);
	});
});

describe("R11 AI 構文", () => {
	test("6 つの構文を型ごとに拾う", () => {
		const text = [
			"これは単なるツールではなく、思想なのです。",
			"速さではなく、正しさである。",
			"軽量であり、高速であり、安全である。",
			"キャッシュすることで、応答を速くできる。",
			"ここで大事なのは順序だ。",
			"一方で、コストは増える。しかし、効果は大きい。だから、採用した。",
		].join("\n\n");
		const labels = run("R11", text).map((x) => x.message);
		expect(labels).toEqual([
			"「単なるAではなく、Bなのです」型",
			"「Aではなく、Bである」型",
			"「Aであり、Bであり、Cである」型",
			"「Aすることで、Bできる」型",
			"「ここで大事なのは〜」型",
			"「一方で〜。しかし〜。だから〜」型（接続詞始まりが 3 文連続）",
		]);
	});
	test("「単なる〜ではなく」は 1 文につき 1 件", () => {
		expect(run("R11", "単なる道具ではなく、相棒なのです。")).toHaveLength(1);
	});
	test("接続詞始まりが 2 文なら指摘しない", () => {
		expect(run("R11", "一方で、コストは増える。しかし、効果は大きい。採用した。")).toHaveLength(0);
	});
	test("普通の文は拾わない", () => {
		expect(run("R11", "昨日は雨だった。今日は晴れている。明日は分からない。")).toHaveLength(0);
	});
});

describe("R12 変な比喩", () => {
	test("比喩として使われた語を拾う", () => {
		const text =
			"この本はチームの羅針盤だ。営業と開発は車の両輪である。彼は組織の潤滑油になった。信頼が成長の土台となる。事業の3本柱を立てた。読書は思考の筋トレです。失敗はスパイスのようなものだ。挑戦が会社のDNAだ。この記事が人生の地図になる。成功のレシピです。好奇心がエンジンとなる。";
		const labels = run("R12", text).map((x) => x.message.replace(/（.*）/, ""));
		expect(labels).toEqual([
			"比喩「羅針盤」",
			"比喩「車の両輪」",
			"比喩「潤滑油」",
			"比喩「土台」",
			"比喩「柱」",
			"比喩「筋トレ」",
			"比喩「スパイス」",
			"比喩「DNA」",
			"比喩「地図」",
			"比喩「レシピ」",
			"比喩「エンジン」",
		]);
	});
	test("文字通りの用法は拾わない", () => {
		const text =
			"API の仕様書を書いた。設計書を読む。V8 エンジンで動く。カレーのレシピを載せる。地図アプリを開く。栄養バランスを考える。筋肉痛になった。DNA を抽出した。";
		expect(run("R12", text)).toHaveLength(0);
	});
	test("羅針盤は文脈に関係なく拾う", () => {
		expect(run("R12", "羅針盤を買った。")).toHaveLength(1);
		expect(run("R0", "羅針盤を買った。")).toHaveLength(0);
	});
});
