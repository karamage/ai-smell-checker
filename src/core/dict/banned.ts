import type { Severity } from "../types.ts";

export interface BannedEntry {
	/** 文字列は部分一致、RegExp はそのまま */
	pattern: string | RegExp;
	severity: Severity;
	/** なぜ臭いか・どう直すか */
	hint: string;
}

const H = "high";
const M = "mid";
const L = "low";

/**
 * AI 生成文に頻出する常套句。
 * 「〜と言えるでしょう」「〜ではないでしょうか」は R3 で扱うのでここには入れない。
 */
export const BANNED: BannedEntry[] = [
	// 結論の押し付け・まとめ口調
	{
		pattern: "いかがでしたか",
		severity: H,
		hint: "読者に感想を求める締めは削る。言いたいことを言い切って終える",
	},
	{ pattern: "いかがでしょうか", severity: H, hint: "問いかけで逃げない。自分の判断を書く" },
	{ pattern: /結論から(言|い)(う|え|っ)/, severity: H, hint: "予告せず、いきなり結論を書く" },
	{ pattern: "結論として", severity: H, hint: "「結論として」を消して結論だけ残す" },
	{ pattern: "まとめると", severity: H, hint: "読めば分かることを繰り返さない" },
	{ pattern: "総じて", severity: H, hint: "総括の型。具体的な評価に置き換える" },
	{
		pattern: /言うまでもな(く|い)|言うまでもありません/,
		severity: H,
		hint: "言うまでもないなら書かない",
	},
	{
		pattern: "と言っても過言ではありません",
		severity: H,
		hint: "過言かどうかの保険をかけない。言い切る",
	},
	{ pattern: "参考になれば幸いです", severity: H, hint: "定型の締め。削って終わる" },
	{
		pattern: /ぜひ(参考|試|活用|チェック)してみてください/,
		severity: H,
		hint: "「ぜひ〜してみてください」は AI の定型締め",
	},
	// 定型導入・予告口調
	{ pattern: /本記事では|この記事では|今回の記事では/, severity: H, hint: "予告せず本題から入る" },
	{
		pattern: /について(ご)?(紹介|解説|説明)(します|していきます|いたします)/,
		severity: H,
		hint: "「〜について紹介します」は AI 定型オープニング。いきなり本題へ",
	},
	{ pattern: /(見て|みて)いきましょう/, severity: H, hint: "内容を運ばない橋渡し語。削る" },
	{
		pattern: /(?<!について)(?:紹介|解説|深掘り|説明)していきます/,
		severity: H,
		hint: "「していきます」の予告口調。書く内容そのものから始める",
	},
	{ pattern: "ここで注目したいのは", severity: H, hint: "注目させる前に、注目に値する事実を書く" },
	{
		pattern: /大きく分けて(\d|[一二三四五六七八九十])/,
		severity: H,
		hint: "無理に N 分割しない。論点の数だけ書く",
	},
	{
		pattern:
			/(\d|[一二三四五六七八九十])つの(ポイント|理由|メリット|デメリット|方法|ステップ|コツ|特徴|観点)/,
		severity: H,
		hint: "「3つのポイント」型は AI の構造化癖の典型",
	},
	{ pattern: /^さて、/m, severity: M, hint: "無色の話題転換。前段の具体で繋ぐ" },
	{ pattern: /^それでは、/m, severity: M, hint: "無色の話題転換。削る" },
	{ pattern: "このように", severity: M, hint: "「このように」で受け直す前に、そのまま話を進める" },
	{ pattern: "このような中", severity: M, hint: "空疎な接続。何が起きたかを書く" },
	{
		pattern: /以下(の通り|に示します|にまとめます)/,
		severity: M,
		hint: "「以下の通り」→ 箇条書きの型。本文で書く",
	},
	// 予防線
	{ pattern: "一概には言えません", severity: H, hint: "言い切れないなら条件を具体的に書く" },
	{ pattern: "個人差がありますが", severity: H, hint: "免責は削る" },
	{ pattern: "あくまで一例ですが", severity: H, hint: "例なら例として堂々と書く" },
	{ pattern: /という側面もあります/, severity: M, hint: "側面をぼかさず、何がどうなのか書く" },
	{
		pattern: /ではないかと思います/,
		severity: M,
		hint: "二重の曖昧化。「〜だと思う」か言い切りに",
	},
	{ pattern: /かもしれません/, severity: L, hint: "多用すると意見のない文章になる" },
	{
		pattern: /と言われています/,
		severity: L,
		hint: "伝聞に逃げず、誰が言ったかか自分の判断を書く",
	},
	// 過剰な強調・空虚な形容
	{
		pattern: /(非常に|極めて|とても)重要/,
		severity: M,
		hint: "強調語の代わりに、なぜ重要かを一文で",
	},
	{ pattern: /重要なのは/, severity: M, hint: "何が重要かを直接書く" },
	{ pattern: /大切なのは/, severity: M, hint: "何が大切かを直接書く" },
	{ pattern: /ポイントは/, severity: L, hint: "「ポイントは」の前置きは要らない" },
	{ pattern: "まさしく", severity: M, hint: "強調語を削る" },
	{ pattern: "不可欠", severity: M, hint: "何がどう不可欠かを書かないと空語" },
	{ pattern: "核心", severity: M, hint: "「核心」は中身を言わない空語。何がどう肝心なのか書く" },
	{ pattern: /鍵とな(る|ります)/, severity: M, hint: "「鍵となる」は AI 好みの空語" },
	{ pattern: "根本的な", severity: M, hint: "何がどう根本的なのか具体に" },
	{ pattern: /多角的|包括的|総合的/, severity: M, hint: "どの角度から見たのかを書く" },
	{ pattern: /重要な役割を(果た|担)/, severity: M, hint: "どんな役割かを書く" },
	{ pattern: /欠かせ(ない|ません)/, severity: L, hint: "なぜ欠かせないかを書く" },
	{ pattern: /可能性を秘めて/, severity: H, hint: "AI の締め定型。具体的な見通しを書く" },
	{
		pattern: /(が|と)期待され(ます|ています)/,
		severity: M,
		hint: "誰が期待しているのか。自分の予想を書く",
	},
	{ pattern: "注目を集めています", severity: M, hint: "誰が注目しているのか具体に" },
	{
		pattern: /シームレス|革新的|画期的|飛躍的/,
		severity: M,
		hint: "プレスリリース語。何がどう変わるか書く",
	},
	{ pattern: /(効率的|効果的)(に|な)/, severity: L, hint: "どう効率的なのかを数字か具体で" },
	{ pattern: /様々な|さまざまな|多様な/, severity: L, hint: "具体を省く癖。例を 1 つ挙げる" },
	// 空虚な動詞
	{ pattern: /掘り下げ(る|て|ます)|深掘り/, severity: M, hint: "掘り下げた中身そのものから書く" },
	{ pattern: "言語化する", severity: M, hint: "言語化した内容を書く" },
	{ pattern: /について見ていく/, severity: M, hint: "予告せず内容から始める" },
	{ pattern: /を探求する/, severity: M, hint: "何をどう調べたかを書く" },
	{
		pattern: /正面から(扱|見|書|立て|回収)/,
		severity: M,
		hint: "姿勢の宣言。扱う内容そのものを書く",
	},
	{ pattern: /を活用(し|する|できる)/, severity: M, hint: "素直に「使う」" },
	{ pattern: /することができ(ます|る)/, severity: M, hint: "「〜できます」で十分" },
	{ pattern: /を実現(し|する|できる)/, severity: L, hint: "何がどうなるかを書く" },
	{ pattern: /押さえておきましょう/, severity: M, hint: "先生口調の定型。削る" },
	{ pattern: /留意(し|する|が必要)/, severity: L, hint: "「気をつける」で十分" },
	{ pattern: /が挙げられます/, severity: M, hint: "列挙の型。主語を立てて言い切る" },
	{ pattern: /が求められ(ます|ています)/, severity: M, hint: "誰が求めているのか書く" },
	// 接続詞の連打
	{ pattern: /^(さらに|加えて|一方で|また)、/m, severity: L, hint: "段落頭の接続詞。文脈で繋ぐ" },
	{ pattern: /(する|の)上で、/, severity: L, hint: "「〜する上で」は硬い。「〜するとき」に" },
	{ pattern: /を通じて/, severity: L, hint: "「〜で」に置き換えられることが多い" },
	{ pattern: /におい(て|ては)/, severity: L, hint: "「〜で」「〜では」で足りる" },
	// 感嘆・共感の演出
	{ pattern: /驚くべきことに|興味深いことに/, severity: M, hint: "驚きは事実の落差で伝える" },
	{ pattern: /なんですよね/, severity: L, hint: "共感演出の多用。事実を書く" },
	{ pattern: /一助となれば/, severity: H, hint: "定型の締め。削る" },
	// 区切り・記号・枕詞
	{
		pattern: /-{3,}|—+|―+|─{2,}/,
		severity: H,
		hint: "ダッシュ区切りは AI 特有。段落を分けるか、読点や「…」で繋ぐ",
	},
	{
		pattern: /✅\uFE0F?/,
		severity: H,
		hint: "チェック絵文字の見出し・箇条書きは AI の定番。文字で書く",
	},
	{
		pattern: /正直(に)?言(う|え|っ)/,
		severity: H,
		hint: "「正直言うと」の枕詞は定型化しやすい。本音は前置きなしで書く",
	},
	{
		pattern: /先に白状/,
		severity: H,
		hint: "「先に白状すると」は結論の予告と同じ型。白状する中身から書く",
	},
	{
		pattern: /効(く|いた|いて|き)/,
		severity: M,
		hint: "「効く」は何がどう良くなったかを言わない。数字か具体で書く",
	},
	{
		pattern: /気づき|気付き/,
		severity: M,
		hint: "「気づき」でまとめず、気づいた内容そのものを書く",
	},
	// 追加分（2026-09-17 指定）: 語彙
	{ pattern: "要するに", severity: M, hint: "要約の前置き。要約した中身だけ書く" },
	{
		pattern: /本質的に|根源的に/,
		severity: M,
		hint: "何がどう本質なのかを書かずに深さを装う語。具体で言い換える",
	},
	{
		pattern: /問い(?!合わせ|合せ)/,
		severity: L,
		hint: "「問い」と名詞化せず、何を疑問に思ったのかを文で書く",
	},
	{ pattern: "文脈", severity: L, hint: "「文脈」は状況を指す便利語。何の話の流れかを書く" },
	{
		pattern: /(?<!データ|木|階層|ディレクトリ|フォルダ)構造(?!体|化|物)/,
		severity: L,
		hint: "「構造」で抽象化せず、何と何がどう繋がっているかを書く",
	},
	{ pattern: "視座", severity: M, hint: "「視座」は硬い。「立場」「見方」で足りる" },
	{
		pattern: "余白",
		severity: L,
		hint: "比喩としての「余白」は AI 好み。何を決めていないのかを書く",
	},
	{
		pattern: "というものです",
		severity: M,
		hint: "「〜というものです」の説明口調。「〜です」に削る",
	},
	{
		pattern: /(?<!紹介|解説|深掘り|説明)していきます/,
		severity: M,
		hint: "「〜していきます」の予告口調。今していることを書く",
	},
	{
		pattern: /読者の(皆さん|皆様|みなさん|みなさま)/,
		severity: H,
		hint: "読者に呼びかけない。伝えたいことを直接書く",
	},
	{ pattern: "羅針盤", severity: H, hint: "AI 好みの比喩。何を決める基準なのかを書く" },
	{ pattern: "受け皿", severity: M, hint: "比喩をやめて、何がどこに入るのかを書く" },
	{
		pattern: /種を(まく|蒔く|撒く)/,
		severity: H,
		hint: "「種をまく」は空虚な比喩。実際にやったことを書く",
	},
	{ pattern: "出血", severity: M, hint: "損失の比喩。金額や件数で書く" },
	{
		pattern: /解像度(を上げ|が上が|を高め|が高ま)/,
		severity: H,
		hint: "「解像度を上げる」は流行りの空語。何が分かるようになったかを書く",
	},
];
