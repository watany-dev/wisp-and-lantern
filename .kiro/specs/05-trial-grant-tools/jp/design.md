# 設計: 試練2「The Locked Shed」

> 和訳です。**正本は英語版** [`../design.md`](../design.md) です。英語版を変えたら、同じPRでこのファイルも直します。識別子・パス・コマンド・要件ID（`REQ-5.n`）・不変条件ID（`INV-n`）は原文のままです。

`requirements.md`（REQ-5.n）を実装します。ADR 0001（純粋な reducer）、ADR 0003（ゲート）、`.kiro/steering/structure.md` のレイアウト規則に従います。新しい依存も、新しい素材も、新しいADRもありません。reducer は純粋なまま、シーンは薄いまま、というのは ADR 0001 と 0003 がすでに言っていることだからです。

## 子どもがすること

```text
title --小屋ボタンをタップ--> choosing --PickTool--> choosing（道具は0または1）
                               choosing --GiveTool、道具を選んでいる--> tried（open | shut）
                               choosing --GiveTool、未選択--> choosing（同じ状態）
                               tried    --RetryShed--> choosing（未選択）
```

`open` の `tried` が成功です。`open` のあとのやり直しボタンは小屋を遊び直すので、`RetryShed` の意味は1つ、新しい選択に戻ることです。タイトルのほかの場所をタップすると、今も試練1が始まります。

## ドメイン（`src/domain/`）

### 状態

`GameState` はフィールドを1つ足します。新しい `phase` は足しません。

```ts
// shed.ts
export const tools = ["key", "broom", "hammer"] as const;
export type ToolId = (typeof tools)[number];
export type Shed = { stage: "choosing"; pick: ToolId | null } | { stage: "tried"; tool: ToolId };
export const initialShed: Shed = { stage: "choosing", pick: null };

// state.ts
export const trials = { lane: 1, shed: 2 } as const;
export type GameState = { /* as before */ shed: Shed };
```

この形にした理由:

- **選択と結果は1つの値。** `choosing` は選択（なしか1つ。単一のフィールドなので「高々1つ」は壊れようがない）を持ちます。`tried` は渡した道具を持ち、独自の選択は持ちません。試した道具は、`GiveTool` の瞬間に固定された選択です。フラットな `{ pick, given }` では、選択のない `given` ができてしまいます。`{ pick, tried }` の組はずれる可能性があります。結果は保存せず、試した道具から導きます（`opensDoor`）。これが REQ-5.9.5 です。
- **`phase` は `title | trial | over` のまま。** 小屋は `phase` が `trial` で `trial` が 2 です。新しい phase を足すと INV-1 と、`phase` で切り替えるすべてのシーンが広がります。シーンは代わりに `trial` に従います（後述）。
- **`shed` は常にある。** `trial` が 2 のとき以外は `initialShed` です（INV-23）。

### 関数（`shed.ts`）

```ts
export function opensDoor(tool: ToolId): boolean;       // tool === "key": the fixed rule (REQ-5.5)
export type ShedOutcome = "choosing" | "open" | "shut";
export function shedOutcome(shed: Shed): ShedOutcome;    // choosing | open (key) | shut
export function triedTool(shed: Shed): ToolId | null;    // the tool of a tried stage, else null
export function canGive(shed: Shed): boolean;            // choosing with a tool picked
export function reduceShed(shed: Shed, event: ShedEvent): Shed; // returns `shed` itself when nothing changes
```

`reduceShed`:

- `PickTool { tool }`: `choosing` では `pick` が `tool` になる（すでにそうなら同じオブジェクト）。`tried` では変化なし。
- `GiveTool`: `choosing` で選択があれば `{ stage: "tried", tool: pick }`。未選択、または `tried` なら変化なし。
- `RetryShed`: `tried` では `initialShed`。`choosing` では変化なし。

道具を補正する分岐も、既定の道具を選ぶ分岐も、渡していない道具を取り出す分岐もありません。

### イベント（`events.ts`）と reducer

```ts
export type ShedEvent = { type: "PickTool"; tool: ToolId } | { type: "GiveTool" } | { type: "RetryShed" };
export type GameEvent = /* as before */ | { type: "StartShed" } | ShedEvent;
```

各イベントが効く場所です。「同じ」は同じ状態オブジェクトを返すという意味です。試練1の列は今のコードの動きで、変更点は印を付けています。

| イベント | `title` | 試練1（`phase` が `trial`、`trial` が 1） | 試練2（小屋） | `over` |
|---|---|---|---|---|
| `Start` | プレイを始める（試練1） | 言語だけ | 言語だけ（**新しい場面、コードは同じ**） | プレイを始める |
| `StartShed`（**新規**） | `phase` が `trial`、`trial` が 2、`shed` は初期値。`run` と `lane` は手つかず | 同じ | 同じ | 同じ |
| `Tick` | 同じ | 時計が減る。0でプレイ終了 | 同じ（**変更: `trial` で守る**） | 同じ |
| `Ask`、`PickCard`、`Retry` | 同じ | レーンの規則 | 同じ（**変更: `trial` で守る**） | 同じ |
| `PickTool`、`GiveTool`、`RetryShed`（**新規**） | 同じ | 同じ | `reduceShed` | 同じ |
| `SetLang`、`MoveHeroTo` | 従来どおり | 従来どおり | 従来どおり | 従来どおり |

`reducer.ts` はヘルパー `inTrial(state, n)` = `state.phase === "trial" && state.trial === n` を足します。`Ask`、`PickCard`、`Retry`、`Tick` は `inTrial(state, trials.lane)` を、小屋のイベントは `inTrial(state, trials.shed)` を確かめます。`start` はリテラルの 1 の代わりに `trials.lane` を使います。reducer のほかは変わらず、`ask` は今までどおり `scoreSearch` で得点します。

### 結果の表（REQ-5.5）

| 渡した道具 | `shedOutcome` | 扉 | 錠 | 猫 | 星 | メッセージ（キー） | ボタン |
|---|---|---|---|---|---|---|---|
| （なし、選択中） | `choosing` | 閉 | 閉 | 中、窓のところ | なし | `shed.pick` か `shed.ready` | なし |
| 鍵 | `open` | 開 | 開 | 外、小屋のそば | あり | `shed.open` | `shed.again` |
| ほうき | `shut` | 閉 | 閉 | 中 | なし | `shed.shut` | `shed.retry` |
| ハンマー | `shut` | 閉 | 閉 | 中 | なし | `shed.shut` | `shed.retry` |

結果はこの3つだけです。規則に乱数はなく、試した道具のほかの状態もなく、言語やタイミングの入力もありません。

### 鍵だけが開ける理由（REQ-5.8.6）

この試練は、1つの考え（L2）を見せるための舞台です。ウィスプは渡された道具が許すことしかできない。6歳の子どもにそれを感じてもらうために、小屋には錠が1つ、それに合う道具が1つあり、ウィスプは渡されたものをそのまま試します。これはゲームの固定の規則であり、本物のAIについての主張ではありません。

- 本物のエージェントは正しい道具があっても失敗することがあり、本物のハンマーは錠を壊せることがあります。ゲームはどちらも言いません。ほうきやハンマーは扉を「開けられない」とは言わず、この小屋では扉が閉じたままだった、と言うだけです。別の解法は出しません。2つ目の解法があると、子どもはウィスプが何を渡されたかではなく、何が許されているかを当てずっぽうで選ぶことになるからです。
- L2の後半（権限が大きすぎると事故になる）は見せません。何も壊れず、猫は危険な目に遭いません。
- 鍵はゲームの小屋のものです。言葉は、現実の家の鍵、パスワード、私的なものをAIに渡すようには決して言いません。それはL4で、ここでは説明しません。

### 不変条件

新しい7つは `requirements.md` にあります。既存のものとの範囲の関係:

| id | 対象 | 小屋では |
|---|---|---|
| INV-1、INV-2 | `phase`、`trial` | グローバル。`trial` は 2 になりうる。変更なし、小屋のイベント込みで再実行 |
| INV-3、INV-4 | 破壊しない、決定的 | グローバル。変更なし、**小屋のイベントを含む列でも再実行**（`shed.pbt.test.ts`） |
| INV-5、INV-8〜INV-14 | 試練1のレーン | 定義上、試練1だけ。INV-23 と INV-24 が小屋で `lane` を手つかずに保つので、小屋のイベントを含むどの列でも成り立つ。変更なし |
| INV-15〜INV-17 | 試練1のプレイ | 試練1だけ。小屋では時計が減らされないので「試練中は時間が残っている」は成り立つ（INV-24）。変更なし |
| INV-18〜INV-22 | 小屋の選択、受け渡し、結果、やり直し | 新規、`shed.pbt.test.ts` |
| INV-23、INV-24 | 小屋と試練1は互いに触れない | 新規、`shed.pbt.test.ts` |

`domain-invariants.md` には、この範囲の1行と7行を足します。廃止も付け替えもなく、試練1のテストも変えません。

### モデル検査（`shed.model.test.ts`）

範囲: 小屋ボタンによるタイトルからの入口と、その先のすべての状態。「試練1のすべての状態から小屋に行ける」ではなく（子どもが小屋に行けるのはタイトルからだけで、小屋に出口はない）、通すために小屋の状態を除くこともしません。試練1のモデル検査は、アルファベットも含めてそのままです。

アルファベットは有限で、効いてはいけないイベントも含みます:

- タイトルでは、`Start` 以外のすべて（タイトルでの `Start` は試練1の入口で、専用のモデル検査がある）: `StartShed`、`SetLang`（ja、en）、`MoveHeroTo`（2か所）、小屋のイベント、`Ask`、`PickCard`、`Retry`、`Tick`。
- 入口のあとは、上に加えて `Start`、言語つきの `Start`、小さな値とプレイを終わらせる値の `Tick`。

モデルは実際の reducer の状態を、ゲームの一部ではない2つで包みます: `expected` は、この挑戦で子どもが最後に選んだ道具（`PickTool` で設定、`RetryShed` と `StartShed` で消去）、`plays` は成功した結果の数（上限2）。これらで遷移を状態不変条件として確かめられます: 選択中の状態の選択は期待どおりの道具ちょうど1つ、試した状態の道具は期待どおりの道具。道具のすり替えや2つ目の道具はこれを破ります。

| 検査 | 内容 |
|---|---|
| 不変条件 | `phase`・`trial`・`shed` が合う（`shed` は試練2以外では初期値、試練2は `trial` の中）。小屋では lane と run が初期値のまま。選択中の状態の選択は期待どおりの選択。試した状態の道具は期待どおりの道具。開くのは試した道具が鍵のときだけ |
| ゴール1 | すべての状態から、鍵の `open` の結果に到達できる（ソフトロック） |
| ゴール2 | すべての状態から、小屋で新しい選択中（未選択）に到達できる |
| ゴール3 | すべての状態から、2回目の成功に到達できる（`plays` が 2）: 成功後の遊び直し |
| 到達の証拠 | 鍵の `open`、ほうきの `shut`、ハンマーの `shut` それぞれへの最短のトレース。「この状態でない」という不変条件から得る（報告された反例が証拠） |
| 状態数 | テストと、タスク3.1の Result に記録 |

規則を意図的に壊したときには失敗しなければならず、その反例をテストに残します:

| 意図的な破壊 | 失敗する検査 | 反例 |
|---|---|---|
| 鍵の受け渡しが無視される（鍵が扉を開けられない） | ゴール1がすべての状態で行き詰まる | 開始状態、トレースは空 |
| `RetryShed` を無視する | ゴール1が行き詰まる | 試したほうき（最初に見つかるもの）、トレース `StartShed, PickTool broom, GiveTool` |
| 成功のあとの `RetryShed` を無視する | ゴール3が開始から行き詰まる。ゴール1は通る | 開始状態。成功そのものからは、トレースが空の、試した鍵 |
| 何を選んでいても `GiveTool` が鍵を渡す | 試した道具の不変条件 | `StartShed, PickTool broom, GiveTool` |
| `PickTool` が最初の選択を保つ | 選択の不変条件 | `StartShed, PickTool key, PickTool broom` |
| 小屋で `Tick` が時計を進める | run の不変条件 | `StartShed, Tick 1000` |

破壊は、試練1の検査と同じく実際の `reduce` を包む `step` のラッパーで、そのためにソースは編集しません。テストは実際のトレースを検証し、タスク3.1の Result に記録します。

## 文言（`src/content/`）

`strings.ja.json` と `strings.en.json` に、同じキーで `shed` グループを足します。`{0}` は道具名です（数字なのは、kidゲートが日本語中のラテン文字を拒否するため）。`⏎` は改行です。

| キー | ja | en | 使う場所 |
|---|---|---|---|
| `shed.enter` | ねこを たすけよう | Free the cat | タイトルの小屋ボタン |
| `shed.guide` | どうぐを わたして⏎ねこを たすけよう | Hand over a tool⏎to free the cat | 上の行、常に |
| `shed.pick` | どうぐを ひとつ⏎えらんでね | Pick one tool | 選択中、未選択 |
| `shed.ready` | ウィスプを タップして⏎{0}を わたそう | Tap the wisp to⏎hand over the {0} | 選択中、道具を選んだ |
| `shed.open` | ねこが でてきた！⏎{0}を つかったよ | The cat is out!⏎The wisp used the {0} | open の結果のメッセージ |
| `shed.shut` | {0}を つかったよ⏎とびらは あかなかった | The wisp used the {0}⏎The door stayed shut | shut の結果のメッセージ |
| `shed.lesson` | {0}を わたしたら⏎あけられたね | You gave a {0}⏎It opened the door | 締めの文、open のみ |
| `shed.again` | もういちど あそぶ | Play again | open のあとのボタン |
| `shed.retry` | ほかの どうぐを ためそう | Try another tool | shut のあとのボタン |
| `shed.tools.key` | かぎ | key | ラベル |
| `shed.tools.broom` | ほうき | broom | ラベル |
| `shed.tools.hammer` | ハンマー | hammer | ラベル |

この言葉にした理由:

- **案内。** 1文で課題全体を言い、道具を1つ言うので、子どもが何かに触れる前から「1つで足りる」が成り立ちます。`ready` は選んだ道具の名前を繰り返すので、枠だけでなく言葉でも選択を確認できます（ハードルール7）。
- **メッセージと締めの文は別の文。** メッセージは何が起きて、ウィスプがどの道具を使ったかを言います（`The cat is out! The wisp used the key`）。締めの文は、子どもの側から見てなぜうまくいったかを言います（`You gave a key, so it opened`）。同じ文を共有しないので、REQ-5.8 の求めどおりです。どちらも道具名は試した道具から取るので、2つの違う道具を名指しすることはありません。
- **`shut` は事実を言う。** 「The door stayed shut」/`とびらは あかなかった` はありのままの観察です。「wrong」「bad」「no」「fail」やその日本語の対応語はなく、隠してもいません。ボタンは何がいけなかったかではなく、次にすること（`Try another tool`）を言います。
- **締めの文。** 依頼は方向性として `かぎを わたしたら` / `あけられたね` と `You gave a key` / `It opened the door` を示していました。kid-reader の手動確認（`kid-reader` エージェントはこのセッションでは実行できないため、`.kiro/agents/kid-reader.md` のルーブリックを手で当て、結果はタスク4.1のプルリクエストに書く）のあと: 日本語はそのまま。`あけられたね`（開けることができたね）は、できたのは渡したからだと言っていて、これがL2の要点であり、1行は最大10字です。英語もそのまま。子どもがした順（渡した、それから開いた）の短い2文で、「it」は直前のメッセージが名指ししたウィスプです。1行は18字なので、英語の締めの文は試練1（12字）より長くなります。試練1の12字は試練1自身のキー（`lane.lesson`）の制限で、このキーの制限はレイアウトです（22pxで折り返し320px。画面での確認はタスク7.1、テストは英語1行20字まで）。次のプレイテストで、子どもが「it」をウィスプと読むかを確認します。
- **本物のAIについての主張なし。** 道具は必ず効く、正しい道具さえあればAIは何でもできる、AIは何でも知っている、友達だ、と言う文字列はありません。contentテストが、試練1と同じ語のリストに、家・家の鍵・パスワードの語を足して確認します。

contentテストは、道具名を取るすべてのメッセージを3つの日本語名で描画し、日本語のルール（漢字なし、ラテン文字なし、12字、2行）を当てます。`lane` と `run` の文字列は変えません。

## ゲーム（`src/game/`）

### 入口とシーンの選択

- `TitleScene` にボタンを1つ足します: 金色のパネル（`drawButton`）に小さな鍵の絵と `shed.enter`、中心 (195, 736)、300 x 80。既存の「どの押下でもゲームを始める」を「どのオブジェクトにも当たらなかった押下がゲームを始める」にします（Phaser はシーン全体のハンドラーに、ポインターの下のオブジェクトを渡す。`LaneScene` はすでにこれで床とオブジェクトを分けている）。ボタン自身のハンドラーが `StartShed` を送ります。つまり、ボタンのタップが届くのは `StartShed` だけで、ほかの場所のタップが届くのは `Start` だけです。もし両方が走っても効くのは先に走ったほうだけです: `StartShed` のあとの `Start` は言語を設定するだけで、`Start` のあとの `StartShed` はタイトルを出ているので無視されます。シーンは押下の下のオブジェクトを確かめ続けるので、結果は Phaser がどのハンドラーを先に走らせるかに依存しません。
- `route.ts`（新規、プレーンで単体テストあり）: `sceneFor(state)` は `phase` と `trial` から `"title"`、`"lane"`、`"shed"`、`"over"` を返します。タイトルシーンは、phase が `title` でなくなったら `sceneFor(state)` を開始します。小屋のシーンは何も開始しません（出口がない）。
- `boot.ts` に `ShedScene` を登録します。

シーンの遷移:

| 元 | イベント | 先 |
|---|---|---|
| title | `Start`（ボタンの外をタップ） | lane（試練1、従来どおり） |
| title | `StartShed`（ボタンをタップ） | shed |
| lane | 時間切れ | over（従来どおり） |
| over | `Start` | lane（従来どおり） |
| shed | `GiveTool`、`RetryShed`、`PickTool` | shed（同じシーンが描き直す） |
| shed | （出口なし） | 再読み込みでタイトルに戻る |

### レイアウト（`shed-layout.ts`。残りは `lane-layout.ts`）

数値はすべて390 x 844キャンバス上のゲームピクセルです。小屋は、レーンのウィスプ、メッセージ、結果、締めの文、ボタンの位置を使うので、試練1のレイアウトとそのテストは変わりません。

| もの | 中心 | サイズ | 出どころ |
|---|---|---|---|
| 案内文 | (195, 56) | 折り返し340、2行 | 新規 |
| 小屋の絵 | (195, 198) | 300 x 200: x 45〜345、y 98〜298 | 新規 |
| ウィスプ、選択中 | (195, 370) | タップ領域 96 x 96 | `lane-layout` |
| ウィスプ、渡したあと | (120, 320) | 扉の下 | 新規 |
| メッセージ、選択中 | (195, 454) | 折り返し340、高さ60 | `lane-layout` |
| メッセージ、渡したあと | (195, 380) | 折り返し340、高さ60 | `lane-layout` |
| 締めの文のパネルと文 | (195, 448) | 340 x 64 | `lane-layout` |
| ボタン | (195, 528) | 300 x 80 | `lane-layout` |
| 道具カード | x 75、195、315、y 690 | 96 x 92 | 新規（レーンの色カードの行） |
| タイトルの小屋ボタン | (195, 736) | 300 x 80: y 696〜776 | 新規 |

ヒーローはレーンと同じ (195, 612) から始まります: ボタンと道具の行の間の y 568〜644 が空いています。渡したあとウィスプは (195, 370) を離れるので、メッセージと締めの文は試練1と同じ場所を使い、ウィスプの新しい場所 (120, 320) は、メッセージの上、小屋の下です。

小屋の絵の中（中心からのオフセット。絵は1つの描画で、view から描き直す）:

| 部分 | ローカル位置 | 備考 |
|---|---|---|
| 屋根 | (-130, -30) から (0, -95) から (130, -30) の切妻 | |
| 壁 | x -110〜110、y -30〜90 | 板張り |
| 扉 | x -80〜-10、y 0〜90 | 閉: 板張りで錠は (-22, 45)。開: 左に開いた（x -108〜-80 の平行四辺形）、戸口は暗く、錠はぶら下がって開いている |
| 窓 | x 25〜85、y 5〜55 | 選択中と shut の結果: 猫の顔が見える。開: 空で暗い |
| 外の猫 | (128, 62) に座る、幅36 | 開のみ |
| 星 | (128, 14)、半径14 | 開のみ（既存の `drawStar`） |
| 試した道具 | 錠のところ、44px | 渡したあと、どの道具でも |

スモークが測る点（扉の上の角、窓の中心、外の猫の体、星）は `shed-layout.ts` に名前を付け、スモークと描画が同じ数値を使います。

### View（`shed-view.ts`）

`shedView(state)` は素のデータを返し、シーンがそれを描きます:

```ts
type ShedView = {
  guide: string;
  message: string;
  messageAt: Point;                       // choosing text before the hand-over, result text after
  button: { text: string; event: ShedEvent } | null;
  armed: boolean;                          // the wisp can be handed a tool: ask ring on
  tools: { id: ToolId; label: string; picked: boolean; alpha: number }[];
  picture: { door: "shut" | "open"; cat: "inside" | "outside"; tool: ToolId | null; star: boolean };
  lesson: string | null;                   // open result only
  wispAlpha: number;                       // dimmed while nothing is picked
  wispTarget: Point;                       // home before the hand-over, below the door after
};
```

`message` と `lesson` は `strings[lang].shed` から取り、`{0}` を試した道具または選んだ道具のラベルで置き換えます。`picture` は `shedOutcome` と試した道具だけから導きます。`tools[].alpha` は、渡したあとに渡さなかった道具を薄くします（レーンが選ばなかったカードを薄くするのと同じ）。view は時間にも描画にも依存しません。

### シーン（`scenes/ShedScene.ts`）と絵（`ui/`）

`LaneScene` と同じく薄く: レイアウトからオブジェクトを作り、ゲームを購読し、`shedView` を描き、`PickTool`、`GiveTool`、ボタンのイベントを送り、`stepToward` でウィスプを動かします。`Tick` は送らないので、小屋では何も時間を数えません。Phaser はシーンオブジェクトを再利用するので、フィールドは `create` でリセットします。ヒーローの床ドラッグはレーンと同じです: どのオブジェクトにも当たらなかった押下はヒーローを歩かせ、道具・ウィスプ・ボタンの上の押下は歩かせません（`over.length` から作る `walks` フラグ）。

描画はコードだけです（`ui/shed-art.ts` が小屋・扉・錠・窓、`ui/cat.ts`、`ui/tools.ts` が鍵・ほうき・ハンマー、`ui/tool-card.ts` がカードのウィジェット）。スモークが測る色は `shed-palette.ts`（数値だけで Phaser なし）にあり、`e2e/` が `ui/text.ts` と同じように Node で読み込めます。道具は輪郭で区別します: 鍵（丸い持ち手、長い軸、歯）、ほうき（長い柄、広い穂先）、ハンマー（柄、四角い頭）。shut と open は、扉、錠、猫の位置、星で区別します。動きは小さく、結果を読むのに必要ではありません: ウィスプが所定の位置へ飛び、試した道具が錠のところで1回回るか叩きます。

## 再利用と代替案

| 必要なもの | 再利用 | 代替案と、採らない理由 |
|---|---|---|
| 状態とイベント | `reduce`、`GameState`、`GameEvent`、`createGame`、`window.__game` | 2つ目のストア: 不要 |
| 小屋の規則 | `reduceLane` の型: 変化がなければ入力をそのまま返す小さな reducer | 道具を `Lane`（色と物の6スロットのレーン）に入れる: 色と物のための型に道具を押し込むことになり、INV-8〜INV-14 を壊す |
| イベント | 新しい `PickTool`、`GiveTool`、`RetryShed` | `PickCard`、`Ask`、`Retry` の流用: 名前を共有すると、試練1のテストや試練2のハンドラーが違う状態に作用しうる。コストはイベント名が3つ増えること |
| 試練の選択 | `trial` の番号 | 新しい `phase`: INV-1 と、すべての `phase` の switch が広がる |
| レイアウト | ウィスプ、メッセージ、結果、締めの文、ボタンの `lane-layout.ts` の位置 | その数値のコピー: 1つのレイアウトに2つの出どころ |
| カード | `createCard` の見た目（面、ラベル、選択の印） | `createCard` の汎用化: 別の描画関数が要る試練のために動いている試練1のコードを変える。`tool-card.ts` は約15行を繰り返すだけ |
| 背景、カメラ、文字、ウィスプ、ヒーロー、ボタン、星、選択の印 | `drawBackground`、`fitCamera`、`textStyle`、`createWispArt`、`createHero`、`drawButton`、`drawStar`、`drawPickedMark`、`drawCardFace` | 不要 |
| 性質テストとモデルテスト | `checkProperty`、`checkModel` | 不要 |
| スモーク | `tapper`、`clicker`、`pressUntil` 型のヘルパー、`pixels.ts`、`collectErrors`、`expectBundledFont` | 不要。`pressUntil` を export にする |
| ピクセル読み取り | `e2e/pixels.ts` | スクリーンショットのライブラリ: 新しい依存 |

## テスト計画と対応付け

| 層 | 内容 | 要件 |
|---|---|---|
| 単体（`shed.test.ts`） | 各段階の各イベントの `reduceShed`、各道具の `opensDoor`、`shedOutcome`、`canGive`、置き換えた選択、選択は受け渡しではない、未選択での受け渡し、ロック | REQ-5.3〜5.6 |
| 単体（`reducer.test.ts`） | タイトルからだけの `StartShed`、小屋の外での小屋のイベント、小屋での試練1のイベントと `Tick`、小屋での `Start` と `SetLang`、run と lane が手つかず | REQ-5.1、5.7、5.9 |
| 性質（`shed.pbt.test.ts`） | 小屋のイベントを含む INV-3 と INV-4、INV-18〜INV-24、カバレッジ: 全道具の受け渡し、置き換えた選択、各結果のあとのやり直し、成功後の遊び直し | REQ-5.9、5.13 |
| モデル（`shed.model.test.ts`） | 上の状態空間とゴール、意図的な破壊 | REQ-5.6、5.13 |
| content（`shed-content.test.ts`） | 同じキー、`{0}` が置かれる場所に1つ、全道具の日本語ルール、英語の行の長さ、非難語なし、本物のAIや本物の鍵についての主張なし、締めの文は独立した文 | REQ-5.8、5.12 |
| view（`shed-view.test.ts`） | 段階と言語ごと: メッセージ、ボタン、armed、道具と印、絵、open のときだけ締めの文、ウィスプの目標、ja/en | REQ-5.2〜5.8 |
| レイアウト（`shed-layout.test.ts`、`route.test.ts`） | キャンバス内、各段階で重ならない、80以上の対象、ヒーローの帯が空いている、シーンは `trial` に従う | REQ-5.9、5.10 |
| ミューテーション | 生き残りがあれば失敗 | REQ-5.13、5.15 |
| モバイルのスモーク（`smoke.mobile.shed.spec.ts`） | 実際のタップ、REQ-5.14 の流れ、扉・猫・道具名・締めの文のピクセル、jaとenのスクリーンショット、オフライン | REQ-5.1〜5.14 |
| デスクトップのスモーク（`smoke.desktop.shed.spec.ts`） | マウスで同じ。道具の上で押し続けてもヒーローは動かない | REQ-5.10、5.14 |

`tasks.md` が各タスクの要件、テスト、結果を持ちます。

### スモークが絵を見る方法

小屋はキャンバスに描かれ、DOMにはコピーがないので、`open` と言う状態は、扉が描かれていなくても通ってしまいます。そこでスモークは、スクリーンショットの名前の付いた点（`shed-layout.ts`）を、`shed-palette.ts` の色と比べます: 扉の上の角は、閉のとき扉の木の色、開のとき暗い戸口。窓の中心は、猫が中にいるとき猫の毛の色、そうでないとき暗い窓。外の猫の体の点は、外に出たとき毛の色。星の点は `open` のときだけ金色。文字は、試練1のスモークと同じく、メッセージと締めの文の枠の中の明るい画素として数え、日本語と英語で変わる指紋も使います。ピクセルの読み取りは `node:zlib` だけを使います。

## 決定と代替案

- **選択と結果は1つの値。** `choosing` と `tried` の和型（上記）。
- **新しい phase ではなく `trial` で守る。** INV-1 は3つの phase のまま。コストは reducer のヘルパー1つと、試練1の各イベントが小屋で何もしないことのテスト。
- **別々のイベント。** `PickTool`、`GiveTool`、`RetryShed`、`StartShed` で名前が4つ増えるが、試練をまたぐ作用の可能性を消せる。
- **タイトルのボタンはオブジェクトで、新しい画面ではない。** タイトルはすでにある。選択画面はルーターで、範囲外。
- **`StartShed` はタイトルからだけ受け付ける。** 終了画面からは試練1をもう一度遊ぶ。そこに小屋のボタンはない。
- **小屋に出口はない。** 「もどる」ボタンには、新しいイベント（`Leave`）、`shed` をリセットするタイトルへの復帰、プレイの扱いの決定が要る。これは別の機能（試練選択画面）であり、このspecは含めず、REQ-4.6.2 は `requirements.md` で試練1に限定した。子どもは小屋専用のボタンで遊び直し、ページを再読み込みするとタイトルに戻る。「Found, not fixed」に載せる。
- **道具名は `cards.json` ではなく `strings` に。** kidゲートは `strings.ja.json` のすべての値と `cards.json` のラベルを検査する。`cards.json` は試練1のカードのファイルで、contentテストがドメインの色と物に固定している。2つ目のファイルには専用のゲートも要る。
- **ウィスプの新しい場所は扉の上ではなく扉の下。** 結果と、ピクセルの検査のために、扉と錠が見えたままになるようにする。
- **英語の締めの文は12字を超える**（文言の項を参照）。代案は `You gave a key` / `So it could open`（17字、短くならず、扉を指す「it」がある）。`A key let it` / `open the door` のような短い組は子どもにとって不自然。レイアウトテストと画面が決め、最初のプレイテストで子どもの読み方を記録する。
- **モデルの `expected` と `plays`** はテストの中にあり、`GameState` には入れない。ゲームには使い道がないため。

## リスク

- 執筆環境では WebKit が起動しない（システムライブラリ不足。`docs/evidence/didnt-work.md`）。モバイルのスモークは、そこでは iPhone 13 のタッチプロファイルの Chromium で実行し、その旨を書く。本物の WebKit は CI が実行する。CI のスモークが緑になるまで、タスクは完了と呼ばない。
- ピクセルの測定点は描画に依存する。小屋の絵を変えて測定点が動くとスモークが失敗する。測定点と描画は `shed-layout.ts` と `shed-palette.ts` を共有するので、数値は1か所で変わる。
- 絵はコードで、スクリーンショットで目視して判断する。形（扉、錠、猫、道具）は、組み上がった画面を最初に見たあと、もう一度手直しが要るかもしれない。
- 子どもが shut の結果を「ハンマーはだめ」と読むかもしれない。言葉は、何を使い、扉がどうなったかだけを言う。次のプレイテストで、子どもがもう一度ハンマーを試すかを記録する。
