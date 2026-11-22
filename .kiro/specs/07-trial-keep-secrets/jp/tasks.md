# タスク: 試練4「The Listening Shadows」

> 和訳です。**正本は英語版** [`../tasks.md`](../tasks.md) です。英語版を変えたら、同じPRでこのファイルも直します。識別子・パス・コマンド・要件ID（`REQ-n.m`）・不変条件ID（`INV-n`）は原文のままです。

1タスクにつき1ブランチ、1プルリクエスト（`AGENTS.md`）。このspecは、1回のセッションで、1つのブランチ（`07-trial-keep-secrets/trial-4`）に作られ、1つのプルリクエストになります。ユーザーがspecと試練の全体を一緒に求めたことと、domain、view、sceneがイベントについて合って初めてツリーがビルドできるためです。プルリクエストにもそう書きます。どのタスクもゲームを動く状態に保ち、`npm run check` が通ります。入力を画面につなぐタスクは、`npm run build` の後の `npm run smoke` も通ります。

状態: `[ ]` 未着手、`[x]` 完了。タスクは **Result** 行に、実行したことと見たことを書きます。実行していないものは、実行したと記録しません。

順序が各ステップを出荷可能に保つ理由（REQ-7.14）: 2.1がルールを足すが何もそこに届かない。3.1がそれを検査する。4.1が使わない文言を足す。5.1が描かずに画面のロジックを足す（knipはテストを利用者に数える）。6.1が描いてタイトルを変える。試練4に届くようになる唯一のタスク。7.1が本物のタップで遊ぶ。8.1が記録する。6.1より前は何も子どもに届かず、それまで試練1〜3は触れていません。

作業サンドボックスの既定のNodeは22ですが、リポジトリは Node 26 を必要とします（`.nvmrc`）。そのため下の結果はすべて、`scripts/setup-session.sh` が `.cache/node` に入れる固定の Node 26.13.0 で出したものです。ここではWebKitが起動できないので、モバイルのスモークは、コミットしない `.cache/` のローカル設定で、iPhone 13のタッチプロファイルのChromiumで動かしました。数えるのはCIのWebKitの実行です。`reviewer` と `kid-reader` エージェントの基準は手で当てました（エージェントは実行していません）。プルリクエストにもそう書きます。

## このspecが変えた、古い挙動のテスト（REQ-7.14.1）

試練1〜3のテストは、削除も緩和もしていません。下のものは、固定していたものが意図して動いたため変わりました。

| 古いテスト | 新しいテスト | 試練1〜3が弱くならない理由 |
|---|---|---|
| `field-layout.test.ts`「puts the stars, the wisp and the title's button where the design says」: `titleArt` をウィスプy 538、ヒーローy 548に固定 | 同じテストで、y 448とy 458に固定 | 3つのボタンが入るようにタイトルのアートを90ピクセル上へ動かした（REQ-7.1.1）。隣のテスト（アートがボタンの上で終わる、試練1のカードの下でキャンバスの内側、カードがプロンプトとルールを持ってどのボタンにも触れない、畑ボタンが小屋ボタンの8以上上）は関係式で、変更なしで通る。畑と小屋のボタンは元の場所に固定されたまま |
| `title-view.test.ts`「gives the title's words in each language」「puts the 60 seconds in ...」「says in each button's caption ...」 | 同じテストに、3つ目のボタンのラベルとキャプションを足した | 期待が増えただけ: 3つのボタンのキャプションが60秒を持ち、ラベルに数字はなく、「timer なし」と言うものはない |
| `reducer.test.ts`、`over-view.test.ts`、`route.test.ts` | 試練4のケースを追記した同じファイル | 上のケースはバイト単位で同じ。新しい `describe` がその後に続く |
| `e2e/helpers.ts` の `GameState` 型 | `shadows` 項目の付いた同じ型 | 型だけ |

`ui/field-buttons.ts` は変わりました（`ButtonView` 型が `button-view.ts` に移り、絵の描画が2項目増えた表になった）。畑の絵と挙動は変わらず、畑のスモークは通ります。

## 1. Spec

- [x] 1.1 `requirements.md`、`design.md`、`tasks.md` と、`jp/` の和訳を書き、06要件（と `jp/`）の先頭にスコープの注記を足す。ほかのspecの過去の行は編集しない。
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.4, REQ-7.5, REQ-7.6, REQ-7.7, REQ-7.8, REQ-7.9, REQ-7.10, REQ-7.11, REQ-7.12, REQ-7.13, REQ-7.14
  - Tests: なし（文書）。`npm run check` に `check-trace` と日本語テキストのゲートが含まれる（specは許可リストにある）。
  - Result: `npm run check` が通る（数字は8.1）。英語のファイルを先に書き、日本語訳は最終の英語から作った。`check-trace` は49個の不変条件を報告し、プロパティテストのないものはない。

## 2. Domain: ルール

- [x] 2.1 `src/domain/shadows.ts`（品物、その種類、`itemAt`、決定とその採点、`heardItem`、`choiceOf`、`reduceShadows`）、4つのイベント、`GameState.shadows`、`trials.shadows`、reducerの `startShadows`、`leaveShadows`、`decide` を足す。試練4で `Tick` が動き、`Start` が捨てる。`.kiro/steering/domain-invariants.md` にINV-46〜INV-53を足し、INV-15〜INV-17を広げる。
  - Requirements: REQ-7.3, REQ-7.5, REQ-7.7, REQ-7.8, REQ-7.12.1
  - Tests: `shadows.test.ts`（23件: 品物と種類、シード0〜4、9、23、24、2^32 - 1で固定した4つの順番、7つの開始位置からの100個のシードで直前と同じものも3連続もないこと、各段階での各イベント、採点、影が聞いたもの）。`reducer.test.ts`（試練4の入口、イベント、時計、得点、戻る、分離、そして同じボタンをいつも押すと、8回の正しい決定の1,900点に対して450点になること）。`shadows.pbt.test.ts`（18件: 新しいイベントを含むINV-1〜INV-4とINV-15〜INV-17、INV-46〜INV-53、ジェネレーターが4つの決定すべて、2回目の決定、早い「つぎへ」、ラウンド6以降、すべての品物、終了画面、もう一度、両方の戻るに届くこと）
  - Result: すべて通る。`shadows.ts`、`reducer.ts`、`state.ts` は、文、分岐、関数、行が100%。最初のバージョンでStrykerが2つの生き残りを見つけた（あってもなくても同じ答えになる冗長な `stage === "decided"` の条件）。`heardItem` はテスト済みの `choiceOf` を通すようにし、全体の実行の前に、`shadows.ts` と `shadows-view.ts` だけへのStrykerで100.00になった。この条件は、このspecのために `docs/evidence/didnt-work.md` に足した最初の行。

## 3. モデル検査

- [x] 3.1 `shadows.model.test.ts` を足す: 実物のreducerを、子どもがしたことの独立した記録で包む。
  - Requirements: REQ-7.3, REQ-7.7.7, REQ-7.12.4
  - Tests: `shadows.model.test.ts`（20件）
  - Result: すべて通り、約1.2秒。モデルは2,664状態で、2つのシード、両方の決定、戻る、両方の言語、2つのヒーロー位置、短い `Tick` とランを終える `Tick`、ランの中の `Start`、ここでは何も起こさないはずの試練1〜3のイベントを含む。捨てた状態はない。どの状態からも、正しい決定と間違った決定、4種類それぞれ、タイトル、終了画面に届き、時計も戻る道もないときは、新しいラウンド、次のラウンド、2回目の正しい決定にも届く。最短の列は、各種類の決定が2イベント、次のラウンドが3、2回目の正しい決定が4。わざと壊す8つは、それぞれ想定したチェックを失敗させて最短の列を出し、袋小路のチェックは時計か戻る道があると通る。だからそのチェックは両方を取り除く（小屋と畑と同じ発見）。

## 4. Content

- [x] 4.1 `strings.ja.json` と `strings.en.json` に `shadows` グループを足し、contentテストを付け、`npm run kid` と `npm run font` を走らせる。
  - Requirements: REQ-7.1.6, REQ-7.4, REQ-7.6, REQ-7.11, REQ-2.9, REQ-2.10, REQ-2.13, REQ-3.6
  - Tests: `shadows-content.test.ts`（21件）
  - Result: すべて通り、`npm run kid` も通る。`npm run font` はサブセットフォントのファイルを変えなかった: 新しい日本語が使う文字はすでにすべて含まれている（`check-font-coverage` が通る）。viewができる前に、contentテストが実際の欠陥を1つ見つけた: 日本語の `keptSecret` のメッセージがまとめの一言の1行を繰り返していたので、メッセージは「秘密だ」でなく「残した」と言うように変えた。kid-readerの基準は手で当てた（言葉、文節ごとの空白での読み、1つずつの考え、両言語の同じ意味、口調、色）。

## 5. ViewとLayout

- [x] 5.1 `shadows-view.ts`、`shadows-layout.ts`、`button-view.ts` を足す。タイトルの3つ目のボタンとキャプション、終了画面の試練4のアクション、場面の選択を足し、タイトルのアートを上へ動かす。
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.7.4, REQ-7.8.2, REQ-7.9, REQ-7.11.4
  - Tests: `shadows-view.test.ts`（27件）、`shadows-layout.test.ts`（23件）、`title-view.test.ts`、`over-view.test.ts`、`route.test.ts`、`field-layout.test.ts`（その固定値1つ。上記）
  - Result: すべて通る。`shadows-view.ts`、`shadows-layout.ts`、`route.ts`、`over-view.ts`、`title-view.ts` はカバレッジ100%で、生き残りのミュータントもない。レイアウトのテストは、キャンバスの範囲、決めている段階と決めた段階で重ならないこと、80 x 80 以上の対象、上からの順番、ヒーローの領域、バッジの場所とプローブ、タイトルの3つのボタンとカードとアートを確かめる。`button-view.ts` には実行されるコードがなく、カバレッジの表では0/0になる。

## 6. SceneとEntrance

- [x] 6.1 `ShadowsScene`、品物と影のアート、ウィジェット、タイトルの入口（南京錠のボタン）、試練4の終了画面の2つのボタンを足し、sceneを登録する。
  - Requirements: REQ-7.1, REQ-7.2, REQ-7.3, REQ-7.7, REQ-7.9, REQ-7.10, REQ-4.9, REQ-4.11
  - Tests: 専用のものなし（sceneと `ui/` はカバレッジとミューテーションの対象外、ADR 0003）。7.1のスモーク
  - Result: `npm run build` が通る。最初のスクリーンショットを目で判断した: レイアウト、影、吹き出し、バッジはよく読めたが、家の鍵は棒の上の巣箱に見えたので、輪の中に家がある形に描き直して見直した。lintはsceneと `ui/` を1関数30行、複雑度5に抑える。`create` は、タイトルの3つの入口を専用のメソッドで作るので、その範囲に収まる。

## 7. Smoke

- [x] 7.1 試練4を本物のタップとクリックで遊び、絵をピクセルから読む。
  - Requirements: REQ-7.1.3, REQ-7.1.6, REQ-7.2, REQ-7.3, REQ-7.7, REQ-7.9.3, REQ-7.9.5, REQ-7.10, REQ-7.13
  - Tests: `smoke.mobile.shadows.spec.ts`（9件: 日本語での入口と画面、英語で4種類の決定と素早い2回目のタップ、順番と連続、時間切れ・もう一度・ランの途中と終了画面からのタイトルボタン、グレースケールと無音、両言語でのタイトルの3つのボタンと試練1が引き続き始まること、両言語のオフライン）と `smoke.desktop.shadows.spec.ts`（2件: マウスの経路と、ボタンへの押しっぱなしがヒーローを動かさず床の押しは動かすこと）
  - Result: iPhone 13のタッチプロファイルのChromiumとデスクトップChromiumで、43件のスモーク（既存32件と新規11件）が、ワーカー1つで全部通る（6.2分）。既定のワーカー2つでは41件が通り2件が失敗した: 試練1の「REQ-3.7: finishes offline after the first load」（jaとen）が、点灯したスロットを待つあいだに30秒の制限で時間切れになった。単独で、またはそのファイル全体で動かすと、1件約12秒で通り、きれいな `main` で同じワーカー2つの実行は32件すべて通る（3.6分）。つまり失敗は新しいテストがあるときに現れ、2つのワーカーが忙しいときにだけ現れる。どのテストも変えず、時間も延ばしておらず、CIで注意して見る必要がある。読みは測った値: バッジの円はあれば212、なければ44。静かな吹き出しは3つの点すべてが28で、品物の吹き出しは3つとも90を下回ることがない（最も低い組でも119以上のプローブがある）。吹き出しの角は、吹き出しがあれば239、なければ13。スモークだけが見つけて単体テストが見つけなかった欠陥が2つ: チェックの金の枠が南京錠の最初のプローブを通っていたこと、デスクトップのテストが450 msのロックの内側でボタンを押したこと（`docs/evidence/didnt-work.md`）。実行していないもの: WebKit、実機、週ごとの実機確認。

## 8. 最終統合

- [x] 8.1 試練4を、changelog、学習設計、チェックリスト、evidence、steeringの不変条件に記録し、全体のcheckを走らせる。
  - Requirements: REQ-7.14, REQ-4.9, REQ-4.11, REQ-2.12, REQ-2.15, REQ-3.9, REQ-5.15, REQ-6.14
  - Tests: `npm run check`
  - Result: `npm run check` が Node 26.13.0 で通る（exit 0）: フォーマット、lint、型が通る。knipが通る。47テストファイル、1,041テスト。カバレッジは、文100%（532/532）、分岐100%（374/374）、関数100%（175/175）、行100%（465/465）。`npm run verify`（ライセンス、kid文字列、フォントのカバレッジ、evidence、49個の不変条件でプロパティテストがないものがない trace）が通る。Stryker: killed 1,360、タイムアウト1、生き残り0、Strykerのエラー7件はすべてこのspecが変えていないファイル（`field-view.ts` に6、`shed-view.ts` に1。ここでは `main` でStrykerを動かしていないので、それとの比較はしていない）、15分49秒。本番ビルドが通り、gzipのJSは1,024 KBのうち368.1 KB。ShellCheckは、サンドボックスにバイナリもDockerもないため `lint-shell.sh` がスキップした（CIは走らせる）。ここで実行していないもの: `npm audit`、Semgrep、gitleaks、zizmor、zghalint、`perf` ジョブ（通信、Docker、ベースブランチが必要）と、WebKitでのCIのスモーク。CIのスモークが緑になるまで、完了とは呼ばない。
