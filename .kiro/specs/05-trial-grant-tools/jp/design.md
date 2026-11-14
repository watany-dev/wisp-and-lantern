# 設計: 試練2「The Locked Shed」（改訂2: 5つの問題の60秒タイムアタック）

> 和訳です。**正本は英語版** [`../design.md`](../design.md) です。英語版を変えたら、同じPRでこのファイルも直します。識別子・パス・コマンド・要件ID（`REQ-5.n`）・不変条件ID（`INV-n`）は原文のままです。

`requirements.md`（REQ-5.n）の改訂2を実装します。ADR 0001（純粋な reducer）、ADR 0003（ゲート）、`.kiro/steering/structure.md` のレイアウト規則に従います。新しい依存も、新しい素材も、新しいADRもありません。reducer は純粋なまま、シーンは薄いまま、というのは ADR 0001 と 0003 がすでに言っていることだからです。改訂2は、試練1の `Run`（時計、得点、連続、ベスト）と終了画面を再利用し、2つ目の時計は足しません。

## 子どもがすること

```text
title --小屋ボタンをタップ--> choosing（ラウンド0、60秒のプレイが始まる）
choosing --PickTool--> choosing（道具は0または1）
choosing --GiveTool、道具を選んでいる--> tried（freed | stuck）、1回だけ得点
choosing --GiveTool、未選択--> choosing（同じ状態）
tried    --stuck のあとの RetryShed--> choosing（同じラウンド、未選択）
tried    --freed のあとの RetryShed--> choosing（次のラウンド: 違う問題）
プレイ中のどの状態でも --Tick、時計が0--> 終了画面（phase は over、trial は 2）
終了画面 --StartShed--> choosing（ラウンド0、新しいプレイ）
プレイ中か終了画面 --LeaveShed--> title
```

`freed` の `tried` が成功です。`freed` のあとのボタンは「Next puzzle」、`stuck` のあとは「Try another tool」です。どちらも `RetryShed` を送り、意味は1つのままです。新しい選択に戻ること、猫を助けたあとは次のラウンドに進むことです。タイトルのほかの場所をタップすると、今も試練1が始まります。

## ドメイン（`src/domain/`）

### 状態

`GameState` はフィールドも新しい `phase` も足しません。`shed` の形が変わり、小屋は試練1がすでに持っている `run` を使います。

```ts
// shed.ts
export const tools = ["key", "broom", "hammer", "scissors", "ladder"] as const;
export const puzzles = ["lock", "leaves", "boards", "rope", "roof"] as const;
const answers: Record<PuzzleId, ToolId> = { lock: "key", leaves: "broom", boards: "hammer",
                                            rope: "scissors", roof: "ladder" };
export type Shed =
  | { stage: "choosing"; seed: number; round: number; pick: ToolId | null }
  | { stage: "tried"; seed: number; round: number; tool: ToolId };
export const initialShed: Shed = { stage: "choosing", seed: 0, round: 0, pick: null };
```

この形にした理由:

- **選択と結果は1つの値。** `choosing` は選択（なしか1つの道具。単一のフィールドなので「高々1つ」は壊れようがない）を持ちます。`tried` は渡した道具を持ち、独自の選択は持ちません。結果は保存せず、`shedOutcome` が問題と試した道具から導きます。これが REQ-5.9.5 です。
- **`seed` と `round` は両方の段階にある。** なので、どの段階でも問題がわかり、やり直しは同じ問題を保つことも次へ進むこともできます。問題そのものは保存せず、`puzzleAt(seed, round)` が導きます。野原で `fakesOf(seed, round)` がするのと同じです。
- **`phase` は `title | trial | over` のまま。** 小屋は `phase` が `trial` で `trial` が 2 です。終了画面は `phase` が `over` で `trial` は 2 のままで、共有の終了画面はこれで誰を遊び直させるかを知ります。シーンは `trial` と `phase` に従います（後述）。
- **`shed` は `trial` が 2 のとき以外は `initialShed`（INV-23）。** 小屋の終了画面からの `Start` と `LeaveShed` がリセットします。
- **小屋の得点は `state.run`。** 試練1と同じ値で、小屋は `lane` に触れません。

### 関数（`shed.ts`）

```ts
export function newShed(seed: number): Shed;               // round 0 of seed >>> 0, nothing picked
export function puzzleAt(seed: number, round: number): PuzzleId;
export function puzzleOf(shed: Shed): PuzzleId;
export function answerOf(puzzle: PuzzleId): ToolId;        // the fixed rule (REQ-5.5.2)
export function solves(puzzle: PuzzleId, tool: ToolId): boolean;
export type ShedOutcome = "choosing" | "freed" | "stuck";
export function shedOutcome(shed: Shed): ShedOutcome;
export function triedTool(shed: Shed): ToolId | null;
export function canGive(shed: Shed): boolean;              // choosing with a tool picked
export function reduceShed(shed: Shed, event: ShedEvent): Shed; // returns `shed` itself when nothing changes
```

`puzzleAt(seed, round)`: `start = seed % 5`、`step = 1 + floor(seed / 5) % 4` で、問題は `puzzles[(start + step * round) % 5]` です。5は素数で、step は1〜4なので、5ラウンドごとに5つの問題がすべて出て、同じ問題が2回続けて出ることはありません。順番は20通りです。ゲームは、プレイが始まるときに `Math.random` からシードを引きます（野原と同じく `game/seed.ts`）。ドメインは引きません。

`reduceShed`:

- `PickTool { tool }`: `choosing` では `pick` が `tool` になる（すでにそうなら同じオブジェクト）。`tried` では変化なし。
- `GiveTool`: `choosing` で選択があれば `{ stage: "tried", seed, round, tool: pick }`。未選択、または `tried` なら変化なし。
- `RetryShed`: `tried` では、未選択の `choosing` になる。`freed` のあとは round + 1、`stuck` のあとは同じラウンド。`choosing` では変化なし。

道具を補正する分岐も、既定の道具を選ぶ分岐も、渡していない道具を取り出す分岐もありません。

### イベント（`events.ts`）と reducer

```ts
export type ShedEvent = { type: "PickTool"; tool: ToolId } | { type: "GiveTool" } | { type: "RetryShed" };
export type GameEvent = /* as before */
  | { type: "StartShed"; seed?: number }   // from the title, or from the shed's end screen
  | { type: "LeaveShed" }                  // from a run or the end screen of trial 2
  | ShedEvent;
```

各イベントが効く場所です。「同じ」は同じ状態オブジェクトを返すという意味です。

| イベント | `title` | 試練1 | 試練2（小屋） | `over`、試練1 | `over`、試練2 |
|---|---|---|---|---|---|
| `Start` | 試練1を始める | 言語だけ | 言語だけ | 試練1を始める | 試練1を始める、`shed` は初期値（**新規**） |
| `StartShed` | プレイを始める: `seed` のラウンド0、時計は満タン、得点0、ベストは保つ（**変更**） | 同じ | 同じ | 同じ | タイトルからと同じ（**新規**） |
| `LeaveShed`（**新規**） | 同じ | 同じ | タイトルへ。`shed` は初期値、プレイはやり直し、ベストは保つ | 同じ | タイトルへ。小屋からと同じ |
| `Tick` | 同じ | 時計が減る。0でプレイ終了 | 時計が減る。0でプレイ終了（**変更**） | 同じ | 同じ |
| `Ask`、`PickCard`、`Retry` | 同じ | レーンの規則 | 同じ | 同じ | 同じ |
| `PickTool`、`RetryShed` | 同じ | 同じ | `reduceShed` | 同じ | 同じ |
| `GiveTool` | 同じ | 同じ | `reduceShed`、そのあと1回だけ得点（**変更**） | 同じ | 同じ |
| `SetLang`、`MoveHeroTo` | 従来どおり | 従来どおり | 従来どおり | 従来どおり | 従来どおり |

`reducer.ts` はヘルパー `inTrial(state, n)` をそのまま持ちます。`Ask`、`PickCard`、`Retry` は `trials.lane` を、`Tick` はレーンか小屋を、小屋のイベントは `trials.shed` を確かめます。`give` は `reduceShed` を呼び、小屋が変わったときに `scoreSearch(run, shedOutcome(shed) === "freed")` を呼びます。試練1の `ask` と同じ得点の関数です。`startShed` はタイトル、または `trial` が 2 の `phase` `over` を受け付けます。`leaveShed` は `trial` が 2 のとき、タイトル以外のどの phase でも受け付けます。`start` は `shed` も `initialShed` にします。小屋の終了画面から `Start` に届くことがあるからです。`StartShed` のシードは省略できるので、テストや好みのない呼び出し側は、錠から始まる固定の順番になります（`Start` の `lang` が省略できるのと同じです）。

### 結果の表（REQ-5.5）

| 問題 | 答え | freed: 絵 | stuck: 絵 | メッセージ（キー） | ボタン |
|---|---|---|---|---|---|
| （選択中） | | 問題のまま | | `shed.pick` か `shed.ready` | なし |
| どれでも | その答え | 障害物がなくなり、扉が開き（`roof` は除く）、猫は小屋のそば、星 | | `shed.free`、締めの文は `puzzles.<id>.lesson` | `shed.next` |
| どれでも | ほかの道具 | | 障害物はそのまま、扉は閉、猫は中（`roof` では屋根の上） | `puzzles.<id>.stuck` | `shed.retry` |

結果はこの表だけです。規則に乱数はなく、試した道具と問題のほかの状態もなく、言語やタイミングの入力もありません。

### 問題ごとに答えがちょうど1つの理由（REQ-5.8.6）

この試練は、1つの考え（L2）を見せるための舞台です。ウィスプは渡された道具が許すことしかできない。6歳の子どもにそれを感じてもらうために、どの問題にも合う道具が1つあり、ウィスプは渡されたものをそのまま試します。これはゲームの固定の規則であり、本物のAIについての主張ではありません。

- 本物のエージェントは正しい道具があっても失敗することがあり、本物のハンマーは錠を壊せることがあります。ゲームはどちらも言いません。ほうきは扉を「開けられない」とは言わず、ここでは葉っぱがそのままだ、と言うだけです。別の解法は出しません。2つ目の解法があると、子どもはウィスプが何を渡されたかではなく、何が許されているかを当てずっぽうで選ぶことになるからです。
- 改訂2は、最初の版が見せられなかった要点の後半を足します。正しい道具は問題によって変わる、ということです。鍵は最初のラウンドでは答えで、次のラウンドでは間違った道具です。改訂1で「鍵はいつも効く」と覚えた子どもは、今度は絵を見なければなりません。
- L2の後半（権限が大きすぎると事故になる）は、まだ見せません。何も壊れず、猫は危険な目に遭いません。
- 鍵はゲームの小屋のものです。言葉は、現実の家の鍵、パスワード、私的なものをAIに渡すようには決して言いません。それはL4で、ここでは説明しません。

### 不変条件

| id | 対象 | 小屋では |
|---|---|---|
| INV-1、INV-2 | `phase`、`trial` | グローバル。`trial` は 2 になりうる。変更なし、小屋のイベント込みで再実行 |
| INV-3、INV-4 | 破壊しない、決定的 | グローバル。変更なし、**小屋のイベントを含む列でも再実行**（`shed.pbt.test.ts`）。シードはイベントの中にあるので、同じイベントなら同じ状態になる |
| INV-5、INV-8〜INV-14 | 試練1のレーン | 定義上、試練1だけ。INV-24 が小屋で `lane` を手つかずに保つので、小屋のイベントを含むどの列でも成り立つ。変更なし |
| INV-15〜INV-17 | プレイの時計、得点、終了画面 | 小屋のプレイに**広げる**。`shed.pbt.test.ts` を試練1のテストの隣に置く。試練1のテストは変更なし |
| INV-18〜INV-24 | 小屋の選択、受け渡し、結果、やり直し、分離 | 問題と答え（INV-20）、先へ進むやり直し（INV-22）、得点する受け渡し（INV-23）に合わせて書き直し。INV-24 は「lane は初期値のまま」だけを残す |
| INV-40〜INV-43 | 得点、問題の順番、戻る道、開始 | 新規 |

`domain-invariants.md` には、この改訂の1行と、書き直した行を足します。id は保ちます。試練1のテストは変えません。INV-32（試練3）は1つの表明を変えます。野原では `run` がタイトルの値を保ち、`best` だけは違ってよい、というものです。子どもが野原に来る前に、小屋のプレイが best を更新することがあるからです。

### モデル検査（`shed.model.test.ts`）

範囲: 小屋ボタンによるタイトルからの入口と、その先のすべての状態。終了画面と、子どもが戻るタイトルも含みます。「試練1のすべての状態から小屋に行ける」ではなく（子どもが小屋に行けるのはタイトルからだけ）、通すために小屋の状態を除くこともしません。試練1と試練3のモデル検査はそのままです。

アルファベットは有限で、効いてはいけないイベントも含みます: 5つのシード（どの問題も最初に来られる）、`LeaveShed`、`SetLang`、2つのヒーローの位置、5つの道具、`GiveTool`、`RetryShed`、試練1のカード1枚、`Ask`、`Retry`、1秒の `Tick` とプレイ全体の `Tick`、そしてプレイ中の `Start`。（小屋の終了画面での `Start` は試練1を始め、試練1にはタイトルに戻る道がありません。それは単体テストが扱います。）

モデルは実際の reducer の状態を、ゲームの一部ではない3つで包みます: `expected` は、この挑戦で子どもが最後に選んだ道具。`plays` は、助けた猫の数（上限2）。`scoreOk` は、得点が動いてはいけないときに動いた最初のステップから false。状態のキーは、際限なく増えるものを抽象化します: 得点は「なし」か「あり」、時計は「満タン」「進行中」「0」、ラウンドは5で割った余りにします。

| 検査 | 内容 |
|---|---|
| 不変条件 | `phase`・`trial`・`shed` が合う。`shed` は試練2以外では初期値。lane は初期値のまま。時計は0〜60秒で、プレイが終わるのはちょうど0のとき。選択中の状態の選択は期待どおりの選択。試した状態の道具は期待どおりの道具。freed は試した道具が答えのときだけ。得点が動くのは、freed の受け渡しのときだけ |
| ゴール1 | すべての状態から、猫を助けた状態に到達できる（ソフトロック）。どの道具でも到達できる |
| ゴール2 | すべての状態から、タイトルに到達できる |
| ゴール3 | すべての状態から、終了画面に到達できる |
| ゴール4〜6 | 時計も `LeaveShed` もアルファベットに入れない場合: 新しい choosing、次のラウンド、2匹目の猫が、すべての状態から到達できる |
| 到達の証拠 | どの道具でも猫を助けるまでの最短のトレース（3イベント: その問題から始まるシード、選択、受け渡し）と、どの道具でも stuck になる結果までの最短のトレース |
| 状態数 | 9,400。テストと、タスク9.3の Result に記録 |

規則を意図的に壊したときには失敗しなければならず、その反例をテストに残します:

| 意図的な破壊 | 失敗する検査 | 反例 |
|---|---|---|
| 答えの受け渡しが無視される | ゴール1がすべての状態で行き詰まる | 開始状態、トレースは空 |
| `RetryShed` を無視する | ゴール1が行き詰まる（時計と退出なしで確かめる。それらは出口になってしまう） | `StartShed, PickTool broom, GiveTool` |
| 猫を助けたあとの `RetryShed` を無視する | 最初に猫を助けるのはまだ到達できるが、次のラウンドには到達できない | 開始状態。猫を助けた状態そのものからは、トレースは空 |
| 何を選んでいても `GiveTool` が鍵を渡す | 試した道具の不変条件 | `StartShed, PickTool broom, GiveTool` |
| `PickTool` が最初の選択を保つ | 選択の不変条件 | `StartShed, PickTool key, PickTool broom` |
| 小屋で `Tick` が何もしない | すべての状態から終了画面に到達できない | 開始状態、トレースは空 |
| `LeaveShed` を無視する | タイトルに到達できない | `StartShed` |
| stuck の受け渡しも得点する | 得点の不変条件 | `StartShed, PickTool broom, GiveTool` |

破壊は、試練1の検査と同じく実際の `reduce` を包む `step` のラッパーで、そのためにソースは編集しません。

## 文言（`src/content/`）

`strings.ja.json` と `strings.en.json` に、同じキーで `shed` グループを置きます。`{0}` は道具名です（数字なのは、kidゲートが日本語中のラテン文字を拒否するため）。問題ごとに `shed.puzzles.<id>` の下に3つの文があります: `guide`、`stuck`、`lesson`。共通のもの:

| キー | ja | en | 使う場所 |
|---|---|---|---|
| `shed.enter` | ねこを たすけよう | Free the cat | タイトルの小屋ボタン |
| `shed.timeAttack` | 60びょうで いくつ？ | How many in 60 seconds? | そのラベルの下の説明 |
| `shed.pick` | どうぐを ひとつ⏎えらんでね | Pick one tool | 選択中、未選択 |
| `shed.ready` | ウィスプを タップして⏎{0}を わたそう | Tap the wisp to⏎give it the {0} | 選択中、道具を選んだ |
| `shed.free` | ねこが でてきた！⏎{0}を つかったよ | The cat is out!⏎The wisp used the {0} | freed の結果のメッセージ |
| `shed.next` | つぎの もんだい | Next puzzle | 猫を助けたあとのボタン |
| `shed.retry` | ほかの どうぐを ためそう | Try another tool | stuck の結果のあとのボタン |
| `shed.leave` | タイトル | Title | タイトルに戻るボタン |
| `shed.tools.*` | かぎ ほうき ハンマー はさみ はしご | key broom hammer scissors ladder | ラベル |

`⏎` は改行です。問題の文:

| 問題 | 案内（ja / en） | stuck（ja の2行目 / en の2行目） | 締めの文（ja の2行目 / en の2行目） |
|---|---|---|---|
| `lock` | とびらに かぎが かかってる / The door is locked! | とびらは あかなかった / The door stayed shut | あけられたね / It opened the door |
| `leaves` | とびらの まえに おちばが / Leaves block the door! | おちばは そのまま / The leaves are still there | おちばを はけたね / It swept the leaves away |
| `boards` | とびらに いたが うってある / Boards cover the door! | いたは そのまま / The boards are still on | いたを はずせたね / It took the boards off |
| `rope` | とびらが ロープで ぐるぐる / A rope ties the door! | ロープは そのまま / The rope is still tied | ロープを きれたね / It cut the rope |
| `roof` | ねこが やねで こまってる / The cat is on the roof! | ねこは まだ やねの うえ / The cat is still up there | ねこを おろせたね / It got the cat down |

すべての案内の2行目は `どうぐを わたそう` / `Give the wisp a tool` です。すべての stuck のメッセージの1行目は `{0}を つかったよ` / `The wisp used the {0}`、すべての締めの文の1行目は `{0}を わたしたら` / `You gave the {0}` です。

この言葉にした理由:

- **案内は、何が困っているかを言い、それから何をするかを言う。** 道具の名前は言わないので、「1つで足りる」は子どもが何かに触れる前から成り立ち、手がかりは言葉ではなく絵が運びます。`ready` は選んだ道具の名前を繰り返すので、枠だけでなく言葉でも選択を確認できます（ハードルール7）。
- **英語は「hand over」ではなく「give」。** 学習目標とコードは hand over と言いますが、6歳の子どもは give と言います。英語の締めの文は `You gave the {0}` です（改訂1は `a` でしたが、「a scissors」は誤りなので、どこでも `the` にしました）。
- **メッセージと締めの文は別の文。** メッセージは何が起きて、ウィスプがどの道具を使ったかを言います。締めの文は、子どもの側から見てなぜうまくいったかを言います。同じ文を共有しないので、REQ-5.8 の求めどおりです。どちらも道具名は試した道具から取るので、2つの違う道具を名指しすることはありません。
- **`stuck` は事実を言う。** 「The door stayed shut」「The leaves are still there」はありのままの観察です。「wrong」「bad」「no」「fail」やその日本語の対応語はなく、隠してもいません。ボタンは何がいけなかったかではなく、次にすること（`Try another tool`）を言います。
- **英語の行は最大26字。** （改訂1は、メッセージが24字、締めの文が20字。）道具名が長くなりました（`scissors`）: `The wisp used the scissors` は26字です。22pxで340pxの列（締めの文は320px）に入るのは約27字で、タスク9.7のスクリーンショットで余裕があることを確かめます。
- **タイトルの説明は、60秒は小屋のものだと言う。** 改訂1では両方のボタンが「No timer」と言っていました（`06` の REQ-6.1.6）。今は野原のボタンだけがそう言います。
- **本物のAIについての主張なし。** 道具は必ず効く、正しい道具さえあればAIは何でもできる、AIは何でも知っている、友達だ、と言う文字列はありません。contentテストが、試練1と同じ語のリストに、家・家の鍵・パスワードの語を足して確認します。

kid-reader エージェントはこのセッションでは実行できなかったので、ルーブリックを手で当てました（同じ文を6歳の子どもになったつもりで読みました: 1行に1つの考え、ひらがなとカタカナだけ。「しばってある」は長すぎたので「ロープで ぐるぐる」にしました）。結果はタスク9.4のプルリクエストに書きます。contentテストは、道具名を取るすべてのメッセージを5つの名前で描画し、日本語のルール（漢字なし、ラテン文字なし、12字、2行）を当てます。`lane` と `run` の文字列は変えません。

## ゲーム（`src/game/`）

### 入口、終了画面、シーンの選択

- `TitleScene` の小屋ボタンは、`newSeed()` つきの `StartShed` を送ります。どのオブジェクトにも当たらなかった押下は、今も試練1を始めます。小屋のラベルの下のボタンの説明は `titleView(lang).shedCaption`（60秒）で、野原のラベルの下は `noClock` です（`06` の改訂3で削除。同じ言葉の `field.timeAttack` になった）。試練が子どもを戻したあと、タイトルは700msの間タップを無視します（`fromTrial`。以前は `fromField`）。
- `route.ts`: `sceneFor(state)` は変わりません。`phase` と `trial` から `title`、`lane`、`shed`、`field`、`over` を返します。小屋のシーンは、状態が小屋のものでなくなったとき（終了画面、または `{ fromTrial: true }` のタイトル）に `sceneFor(state)` を開始します。
- `OverScene` は `overView(state)` を描き、これはボタンのリストを持つようになりました。試練1: 1つ（遊び直す、action は `play`）。試練2: 2つ（遊び直す、action は `playShed`。タイトル、action は `leave`）。シーンは action をイベントに変え（`playShed` は `newSeed()` でシードを引く）、状態が `over` でなくなったら `sceneFor(state)` を開始します。

シーンの遷移:

| 元 | イベント | 先 |
|---|---|---|
| title | `Start`（ボタンの外をタップ） | lane（試練1、従来どおり） |
| title | `StartShed`（ボタンをタップ） | shed |
| shed | `PickTool`、`GiveTool`、`RetryShed` | shed（同じシーンが描き直す） |
| shed | 時計が0 | over |
| shed | `LeaveShed` | title（しばらくタップを無視） |
| over（試練2） | `StartShed` / `LeaveShed` | shed / title |
| over（試練1） | `Start` | lane（従来どおり） |

### レイアウト（`shed-layout.ts`。残りは `lane-layout.ts`）

数値はすべて390 x 844キャンバス上のゲームピクセルです。小屋は、レーンの上の行、ウィスプ、メッセージ、結果、締めの文、ボタンの位置を使うので、試練1のレイアウトとそのテストは変わりません。

| もの | 中心 | サイズ | 出どころ |
|---|---|---|---|
| 時計、バー、得点 | y 24 | 上の行、レーンと同じ | `lane-layout` |
| 案内文 | (195, 68) | 折り返し340、2行、高さ56: y 40〜96 | 新規（以前は y 56、高さ60） |
| 小屋の絵 | (195, 198) | 300 x 200: x 45〜345、y 98〜298 | 新規 |
| ウィスプ、選択中 | (195, 370) | タップ領域 96 x 96 | `lane-layout` |
| ウィスプ、渡したあと | (120, 318) | 扉の下 | 新規 |
| メッセージ、選択中 | (195, 454) | 折り返し340、高さ60 | `lane-layout` |
| メッセージ、渡したあと | (195, 380) | 折り返し340、高さ60 | `lane-layout` |
| 締めの文のパネルと文 | (195, 448) | 340 x 64 | `lane-layout` |
| ボタン | (195, 528) | 300 x 80 | `lane-layout` |
| 道具カード、上の行 | x 75、195、315、y 690 | 96 x 92 | レーンの色カードの行 |
| 道具カード、下の行 | x 135、255、y 788 | 96 x 92 | レーンの物カードの行 |
| タイトルに戻るボタン | (347, 788) | 80 x 80: x 307〜387 | 新規 |
| 終了画面: 2つ目のボタン | (195, 634) | 300 x 80 | 新規 |
| 終了画面: ボタンが2つのときのウィスプ | (195, 776) | 拡大 1.8 | 新規（試練1は y 690） |
| タイトルの小屋ボタン | (195, 736) | 300 x 80 | 変更なし |

ヒーローはレーンと同じ (195, 612) から始まります: ボタンと道具の行の間の y 568〜644 が空いています。タイトルに戻るボタンは、はしごのカードから4px です。これは意図的な妥協で（REQ-5.10: 80 x 80 未満の対象なし、重なりなし）、リスクに載せています。

小屋の絵の中（中心からのオフセット。絵は1つの描画で、view から描き直す）:

| 部分 | ローカル位置 | 備考 |
|---|---|---|
| 屋根 | (-130, -30) から (0, -95) から (130, -30) の切妻 | |
| 壁 | x -110〜110、y -30〜90 | 板張り |
| 扉 | x -80〜-10、y 0〜90 | 閉: 板張り。開（`roof` 以外のすべての問題）: 左に開いた、戸口は暗い |
| 窓 | x 25〜85、y 5〜55 | 猫が中にいる間は猫の顔が見える。`roof` と、猫が外に出たあとは空 |
| 錠 | (-22, 45) | `lock` だけ: stuck の間は閉、freed で開 |
| 葉っぱ | x -87〜-3、y 63〜93 | `leaves`、stuck の間: 扉の足もとに4色の楕円が12個 |
| 板 | 2枚、96 x 14、y 24 と 66 | `boards`、stuck の間: 扉に打ち付けてある |
| ロープ | y 30、52、74 の3本の帯と (-45, 52) の結び目 | `rope`、stuck の間 |
| 屋根の上の猫 | (-100, -67)、幅36 | `roof`、stuck の間: 左の斜面の上で、案内文からは離れている |
| 外の猫 | (128, 62) に座る、幅36 | freed のみ |
| 星 | (128, 14)、半径14 | freed のみ（既存の `drawStar`） |
| 試した道具 | 44px、問題ごとの位置: `lock` (-38, 45)、`leaves` (-45, 56)、`boards` と `rope` (-45, 45)、`roof` (-100, 0) | 渡したあと、どの道具でも |

スモークが測る点（扉の上の角、窓の中心、外と屋根の上の猫の体、星、葉っぱ・板・ロープのそれぞれ1点）は `shed-layout.ts` に名前を付け、スモークと描画が同じ数値を使います。

### View（`shed-view.ts`）

`shedView(state)` は素のデータを返し、シーンがそれを描きます:

```ts
type ShedView = {
  guide: string;                           // the round's puzzle: what is wrong, and what to do
  message: string;
  messageAt: Point;
  button: { text: string; event: ShedEvent } | null;   // "Next puzzle" after freed, "Try another tool" after stuck
  armed: boolean;
  tools: { id: ToolId; label: string; picked: boolean; alpha: number }[];   // five
  picture: { puzzle: PuzzleId; solved: boolean; tool: ToolId | null; star: boolean };
  lesson: string | null;                   // freed only, the puzzle's own closing line
  wispAlpha: number;
  wispTarget: Point;
  leave: string;                           // the label of the button back to the title
};
```

`picture` は、問題、結果、試した道具だけから導きます。`hudView(state)`（`lane-view.ts`）は時計、バー、得点の文字を返します。毎フレーム変わるので、`shedView` には入れません。

### シーン（`scenes/ShedScene.ts`）と絵（`ui/`）

`LaneScene` と同じく薄く: レイアウトからオブジェクトを作り、ゲームを購読し、`shedView` を描き、`PickTool`、`GiveTool`、ボタンのイベント、`LeaveShed` を送り、`stepToward` でウィスプを動かし、`update` から `tickMs(delta)` で `Tick` を送ります。猫を助けると、得点がぽんと出ます。Phaser はシーンオブジェクトを再利用するので、フィールドは `create` でリセットします。ヒーローの床ドラッグはレーンと同じです。

描画はコードだけです: `ui/shed-art.ts`（小屋、扉、錠、障害物、屋根の上の猫）、`ui/cat.ts`、`ui/tools.ts`（鍵、ほうき、ハンマー、はさみ、はしご）、`ui/tool-card.ts`、そして小さな新しいウィジェットが2つ、`ui/hud.ts`（上の行）と `ui/leave-button.ts` です。スモークが測る色は `shed-palette.ts`（数値だけで Phaser なし）にあります。道具は輪郭で区別します。stuck と freed は、障害物、扉、猫の位置、星で区別します。動きは小さく、結果を読むのに必要ではありません。

## 再利用と代替案

| 必要なもの | 再利用 | 代替案と、採らない理由 |
|---|---|---|
| 状態とイベント | `reduce`、`GameState`、`GameEvent`、`createGame`、`window.__game` | 2つ目のストア: 不要 |
| 時計、得点、連続、ベスト | `Run`、`scoreSearch`、`runDown`、`finishRun`、`restartRun`、`hudView` | 小屋専用の時計: 2つの時計を揃え続けることになり、INV-15〜INV-17 も2回必要になる |
| 終了画面 | ボタンのリストを持つ `OverScene` と `overView` | 小屋専用の終了画面: 得点、ベスト、ロックの2つ目の写し。`phase` が `over` なら、すでに「時計が0」を意味する |
| 小屋の規則 | `reduceLane` の型: 変化がなければ入力をそのまま返す小さな reducer | 道具を `Lane` に入れる: 色と物のための型に道具を押し込むことになる |
| イベント | `PickTool`、`GiveTool`、`RetryShed`、`StartShed`、新しい `LeaveShed` | 小屋の遊び直しに `Start` を流用する: 試練1が始まってしまう |
| 問題の順番 | シードと `puzzleAt`。野原の `fakesOf` と同じ | reducer の中の `Math.random`（ADR 0001を破る）。固定の順番（子どもが1回のプレイで順番を覚えてしまい、改訂1の問題が形を変えて戻る） |
| 試練の選択 | `trial` の番号 | 新しい `phase`: INV-1 と、すべての `phase` の switch が広がる |
| レイアウト | 上の行、ウィスプ、メッセージ、結果、締めの文、ボタンの `lane-layout.ts` の位置 | その数値のコピー: 1つのレイアウトに2つの出どころ |
| カード | `createCard` の見た目 | `createCard` の汎用化: 動いている試練1のコードを変えることになる |
| 性質テストとモデルテスト | `checkProperty`、`checkModel` | なし |
| スモーク | `tapper`、`clicker`、`pressUntil`、`pixels.ts`、`collectErrors`、`expectBundledFont` | なし。シードは、次の1回の抽選のために `Math.random` を置き換える init script で決める |
| ピクセル読み取り | `e2e/pixels.ts` | スクリーンショットのライブラリ: 新しい依存 |

## テスト計画と対応付け

| 層 | 内容 | 要件 |
|---|---|---|
| 単体（`shed.test.ts`） | 道具、問題、答え。いくつかのシードでの `puzzleAt`。各段階の各イベントの `reduceShed`。`opensDoor` は `solves` になった。stuck と freed のあとのやり直し | REQ-5.2〜5.7 |
| 単体（`reducer.test.ts`） | タイトルと小屋の終了画面からだけの `StartShed`、`LeaveShed`、小屋の外での小屋のイベント、小屋での試練1のイベント、小屋での `Start` と `SetLang`、時計・得点・ベスト、試練1の `Start` は `shed` を捨てる | REQ-5.1、5.7、5.9、5.16 |
| 性質（`shed.pbt.test.ts`） | 小屋のイベントを含む INV-3 と INV-4、小屋の INV-15〜INV-24、INV-40〜INV-43、カバレッジ: 猫を助ける全道具の受け渡し、置き換えた選択、各結果のあとのやり直し、複数のラウンド、時間切れ、遊び直し、戻る道 | REQ-5.9、5.13 |
| モデル（`shed.model.test.ts`） | 上の状態空間とゴール、意図的な破壊 | REQ-5.6、5.13、5.16 |
| content（`shed-content.test.ts`） | 同じキー、`{0}` が置かれる場所に1つ、全道具の日本語ルール、英語の行の長さ、非難語なし、本物のAIや本物の鍵についての主張なし、締めの文は独立した文 | REQ-5.8、5.12 |
| view（`shed-view.test.ts`、`over-view.test.ts`、`title-view.test.ts`） | 問題・段階・言語ごと: メッセージ、ボタン、armed、道具と印、絵、freed のときだけ締めの文、ウィスプの目標。終了画面のボタン。タイトルの説明 | REQ-5.1〜5.8、5.16 |
| レイアウト（`shed-layout.test.ts`、`route.test.ts`） | キャンバス内、各段階で重ならない、80以上の対象、ヒーローの帯が空いている、屋根の上の猫が案内文から離れている、障害物は扉の上で測定点の上ではない、シーンは `trial` に従う | REQ-5.9、5.10 |
| ミューテーション | 生き残りがあれば失敗 | REQ-5.13、5.15 |
| モバイルのスモーク（`smoke.mobile.shed.spec.ts`） | 実際のタップ、REQ-5.14 の流れ、障害物・扉・猫・道具名・締めの文・時計・得点のピクセル、jaとenのスクリーンショット、オフライン、時間切れ・遊び直し・戻る道 | REQ-5.1〜5.16 |
| デスクトップのスモーク（`smoke.desktop.shed.spec.ts`） | マウスで同じ。道具の上で押し続けてもヒーローは動かない | REQ-5.10、5.14 |

`tasks.md` が各タスクの要件、テスト、結果を持ちます。

### スモークが絵を見る方法

小屋はキャンバスに描かれ、DOMにはコピーがないので、`freed` と言う状態は、障害物が消えていなくても通ってしまいます。そこでスモークは、スクリーンショットの名前の付いた点（`shed-layout.ts`）を、`shed-palette.ts` の色と比べます: 扉の上の角は、閉のとき扉の木の色、開のとき暗い戸口。窓の中心は、猫が中にいるとき猫の毛の色、そうでないとき暗い窓。外の猫の体の点と屋根の上の点は、猫がそこにいるとき毛の色。星の点は freed のときだけ金色。葉っぱ・板・ロープのそれぞれ1点は、障害物があるとき障害物の色。文字は、試練1のスモークと同じく、メッセージと締めの文の枠の中の明るい画素として数え、日本語と英語の間、2つの問題の案内の間、得点0と100の間で変わる指紋も使います。得点は星の金色で描かれ、金色の画素として数えます。ピクセルの読み取りは `node:zlib` だけを使います。

問題の順番はシードで決まります。ゲームは、プレイを始める押下で `newSeed()`（`Math.random`）を使って引くので、スモークは `page.goto` の前に init script を足し、次の `Math.random` がテストの決めた数（`window.__nextSeed`）を1回だけ返すようにします。そのあとテストは、実際のタップで決まった問題を遊びます。本物のゲームは今もランダムなシードを引きます。

## 決定と代替案

- **「each taku」は、問題と選択肢のそれぞれ、と読む。** コメントは、3つの選択を5つにし、「each taku」にそれぞれ答えを持たせる、と言っています。この語は卓の字で書かれていますが、択の字（同じ音の打ち間違い）と同じに読みます。問いの意味かもしれません。読みは重なります: 5つの道具が5つの選択肢、5つの問題が問い、答えの表は一対一なので、どの道具もちょうど1つの問題の答えで、どの問題も答えがちょうど1つです。メンテナーの意図が違ったなら、変えるのは `shed.ts` の表だけです。プルリクエストの Decisions に書きます。
- **問題は5つで、答えは1つずつ。問題のプールではない。** プールを大きくすると絵も文言も増えます。5つなら5つの道具が埋まり、1回のプレイでどの道具も一度は役に立ちます。
- **順番は、シード、開始位置、歩幅で決める。シャッフルではない。** 60秒のプレイ（多くても約10ラウンド）には20通りで足り、関数は短く、すべてのミュータントを倒せ、同じ問題が続けて出ることもありません。シャッフルにはループと入れ替えが要り、バグが隠れる場所が増えます。
- **小屋は `Run` と終了画面を再利用する。** 代案は `Shed` の中に専用の時計を持つことです。すると `Tick` の規則、得点、ベストが2つになり、INV-15〜INV-17 も2回書くことになります。`phase` が `over` で `trial` が 2 なら、終了画面の view に条件が1つ増えるだけです。
- **間違った道具は、時間も道具も減らさない。** 子どもがやり直している間も時計は進みます。代償は連続だけです。秒数のペナルティは、この試練が目的としているまさにその「試す」ことを罰することになります。
- **自動で次の問題へ進まない**（`04` の「Why not auto-advance」と同じ）。ボタンは残り、子どもは自分のペースで読み、プレッシャーは時計が与えます。
- **`StartShed` はタイトルと、小屋自身の終了画面から受け付ける。** 試練1の終了画面からは試練1を遊び直します。そこに小屋のボタンはありません。
- **タイトルに戻るボタンはいつも画面にある。** 代償は、うっかりタップするとプレイが終わることです。代案の、終了画面だけにボタンを置く方法では、子どもは最大60秒待つことになります。途中で抜けたプレイは終わったものとして数えないので、うっかりタップで失うのは、進行中のプレイだけです。ボタンは下の行の端に置き、多くのタップが行く上の行から離しています。
- **タイトルは、小屋が子どもを戻したあと700msの間タップを無視する**（野原と同じ）。なので、戻るボタンをダブルタップしても試練1は始まりません。
- **試練1の終了画面にはタイトルへの道がない。** コメントは試練2についてでした。足すのは、終わったspecへの別の変更です。
- **`StartShed` のシードは省略できる。** 既存の呼び出しとテストはそのまま動き、錠から始まる固定の順番になります。
- **道具名は `cards.json` ではなく `strings` に。** kidゲートは `strings.ja.json` のすべての値と `cards.json` のラベルを検査します。`cards.json` は試練1のカードのファイルで、contentテストがドメインの色と物に固定しています。
- **ウィスプの新しい場所は扉の上ではなく扉の下。** 結果と、ピクセルの検査のために、扉と障害物が見えたままになるようにします。
- **モデルの `expected`、`plays`、`scoreOk`** はテストの中にあり、`GameState` には入れません。ゲームには使い道がないためです。

## リスク

- 執筆環境では WebKit が起動しない（システムライブラリ不足。`docs/evidence/didnt-work.md`）。モバイルのスモークは、そこでは iPhone 13 のタッチプロファイルの Chromium で実行し、その旨を書きます。本物の WebKit は CI が実行します。CI のスモークが緑になるまで、タスクは完了と呼びません。
- モバイルのスモークは60秒の時計に対してリアルタイムで遊びます。各テストは数問に収め、1回のプレイの半分ほどを超える前に分けます。それでも遅いランナーではプレイが早く終わることがあります。時間切れのテストは、試練1と同じく、終わりまでの跳躍に `dispatch` を使います。
- タイトルに戻るボタンは、はしごのカード（4px）と、子どもの親指が置かれる場所に近い。プレイテストでうっかり退出が見つかったら、上の行に移すか、2回目のタップを求めます。
- 子どもが stuck の結果を「ハンマーはだめ」と読むかもしれません。言葉は、何を使ったか、何がまだあるか、だけを言います。次のプレイテストで、子どもが同じ道具をもう一度試すか、60秒の中で問題の順番を追うのが難しすぎないかを記録します。
- 絵はコードで、スクリーンショットで目視して判断します。5つの問題は、本物のスマホで最初に見たあと、もう一度手直しが要るかもしれません（屋根の上の猫は小さい）。
- 得点のポップアップと HUD は、試練1のシーンを変えずに、`LaneScene` の HUD の25行を `ui/hud.ts` で繰り返しています。2つは後で共有できます。
