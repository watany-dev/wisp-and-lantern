# 設計: 60秒スコアアタック

要件: `requirements.md`。reducer は純粋なまま(ADR 0001): 時間はイベントとして入る。英語版が正。

## ドメイン

`src/domain/run.ts` に1回のプレイのルールを純粋関数で置く。

```ts
type Run = { remainingMs: number; score: number; streak: number; best: number; record: boolean };
```

| 関数 | ルール |
|---|---|
| `pointsFor(streak)` | `100 + 50 * min(streak, 4)` |
| `scoreSearch(run, found)` | 見つけた: `pointsFor(streak)` を足し、連続 + 1。それ以外は連続 0 |
| `runDown(run, ms)` | `remainingMs = max(0, remainingMs - ms)` |
| `finishRun(run)` | `best = max(best, score)`、`record = score > best`(更新前のベストと比べる) |
| `restartRun(run)` | `initialRun`。`best` だけ引き継ぐ |

定数(`balance.ts`): `runMs` 60000 と `score { find 100, streakStep 50, streakCap 4 }`。
`balance.wishes` は6つの品物すべてを、隣同士が色も物も違う順に並べる。

`GameState` に `run: Run` を足し、`phase` に `"over"` を足す。`GameEvent` に `{ type: "Tick"; ms }` を足す。

| イベント | `title` | `trial` | `over` |
|---|---|---|---|
| `Start` | 開始 | 言語だけ設定 | 開始 |
| `Tick` | 無視 | 時計を減らす。0で終了(`finishRun`) | 無視 |
| `Ask` | 無視 | レーンのルール、探し始めたときに一度だけ `scoreSearch` | 無視 |
| `PickCard`、`Retry` | 無視 | レーンのルール | 無視 |
| `SetLang`、`MoveHeroTo` | 従来どおり | 従来どおり | 従来どおり |

`ms <= 0` や `NaN` の `Tick` は同じ状態を返す。採点は `lane.ts` ではなく reducer の `Ask` で行い、
lane は run に依存しない(`outcome(lane) === "right"` で見つけたかを決める)。

### 結果後の自動送りをしない理由

約1.8秒で次のねがいへ進める案は見送った。状態に2つ目のタイマーが増え、スモークが画面と競合し、
6歳が読む速さを奪うため。時計がすでに速さに報いる。ボタンは残す。遊んでみて遅いと分かれば、
`balance.ts` に待ち時間を足して後から入れられる。

### 不変条件

`INV-1` は結果画面まで広げる。新規: `INV-15` 時計はプレイ中は減るだけ、`INV-16` スコアはねがいを持ってきた
`Ask` でだけ増える、`INV-17` trial は残り時間あり・over は残り時間なしで、結果画面は `Start`・`SetLang`・
`MoveHeroTo` だけを受ける。`INV-14` は新しいプレイがまっさらなレーンから始まるため「プレイ中は」を付ける。

### モデル検査

試練1のモデル検査は状態キーから `run` を除き(スコアで状態空間が終わらなくなるため)、ねがいは6つ:
`4 + 2 * 2 * 6 * (12 + 11)` 状態。2つ目の検査は `Tick` と `Start` を加え、どの状態からでもプレイを終えられ、
満タンの新しいプレイを始められることを示す。`Start` がなければ結果画面は行き詰まりになるので、この検査は意味を持つ。

## ゲーム

- `clock.ts`: `tickMs(deltaMs)` が1フレームを 0〜250ms に収める。レーンシーンが `update` から `Tick` を送る。
- `lane-view.ts`: `hudView(state)` が秒数(切り上げ)、バーの割合、スコア文字列を返す。毎フレーム変わるので `laneView` とは別にする。
- `over-view.ts`: `overView(state)` がタイトル、あれば「しんきろく」行、スコア、ベスト、ボタンを返す。
- `lane-layout.ts`: 上の行を y 24、ねがいの行を y 62 から y 76 へ、結果画面の各行と `overLockMs`。
- `scenes/LaneScene.ts` が上の行と「+点」を描き、`over` で `OverScene` を始める。Phaser はシーンの
  オブジェクトを次のプレイでも使い回すので、フィールドは `create` で初期化する。
- `scenes/OverScene.ts` が `overView` を描き、`overLockMs` の間タップを無視して `Start` を送る。
- 文字列: `strings.*.json` に `run` を追加。`lane.again` は「Next」になる。

## 見た目(タスク 2.1)

すべて Phaser の Graphics でコードから描く。画像ファイルは読み込まず出荷もしない(プレースホルダ PNG は削除)ので、
ハードルール5は自明に満たされる。

- **くっきりさ。** キャンバスは `390 x 844` に `pixelRatio`(`ui/pixel-ratio.ts`、1〜2)を掛けた大きさ。
  各シーンが `fitCamera`(`ui/camera.ts`)でメインカメラを同じ倍率にズームするので、位置・大きさ・タップはゲームピクセルのまま。
  文字は `resolution: pixelRatio` で作る。上限2はコストの判断: 3倍のキャンバスは毎フレーム塗るピクセルが2.25倍になり、スマホでは見た目が変わらない。
- **空。** `html`/`body` の CSS グラデーション(`index.html`)と透明なキャンバス。キャンバス内の全画面グラデーションや全画面テクスチャは
  毎フレーム全画面1パス分のコストになる。サンドボックスのソフトウェア描画(GPU なし)で iPhone プロファイルを測ると、
  22 fps に対し CSS の空では 36 fps だった。キャンバスに残るのは小さいものだけ: 月(タイトルと結果画面のみ)、星40個、木2本(`ui/background.ts`)。
- **絵。** `ui/items.ts`(筋と葉のあるかぼちゃ、ガラス・枠・取っ手のあるランタン)、`ui/characters.ts`(光と顔のあるウィスプ、
  ランタンを持った小さな魔女の主人公)、`ui/art.ts`(スロット、ハロのある光ったスロット、カードの面、ボタン、星、時計バー)。
  模様と形のバッジはこれまでどおり品物の上に描くので、色は色以外でも分かる。
- **動き。** ウィスプと主人公はふわふわ浮く(コンテナの中の絵に付けたトゥイーン。コンテナを動かしても競合しない)。
  頼める印のリングは脈打つ。見つけると星が弾み、金の火花が散り、輪が広がる(`fx/sparks.ts`)。タイトルの案内は薄く点滅する。周期はすべて 0.7 秒以上。
- **スモークが読むもの。** スモークは青さでウィスプと文字を見分け、角の色で光ったスロットを見分ける。ウィスプは青い体と縁を保ち、
  空のスロットの縁は光ったパネルより暗く、角の測定位置は中心から 38 から 34 ゲームピクセルに変えて丸い縁から離した。
- **主人公の開始位置**は y 600 から y 612 へ。ボタンの新しい縁を避けるため。

## テスト

単体: `run.test.ts`、`reducer.test.ts`、`balance.test.ts`、`lane-view.test.ts`、`over-view.test.ts`、
`clock.test.ts`、`lane-layout.test.ts`。性質: INV-1、INV-14 から INV-17。モデル: 上の検査。
スモーク: 本物のタップと本物の時計でのモバイル1本(時間切れへの移動だけ `dispatch`)と、マウスのデスクトップ1本。
