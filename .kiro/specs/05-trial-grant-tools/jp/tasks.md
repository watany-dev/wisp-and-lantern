# タスク: 試練2「The Locked Shed」

> 和訳です。**正本は英語版** [`../tasks.md`](../tasks.md) です。英語版を変えたら、同じPRでこのファイルも直します。識別子・パス・コマンド・要件ID（`REQ-5.n`）・不変条件ID（`INV-n`）は原文のままです。

1ブランチ・1プルリクエストにつき1タスク（`AGENTS.md`）。ブランチは `05-trial-grant-tools/<task>`。前のタスクがマージされたあとの `main` から切ります。どのタスクもゲームが動く状態で終わり、`npm run check` を通します。タスク 6.1、7.1、8.1 は `npm run build` に続けて `npm run smoke` も通します。スマホで差分を追える大きさにします: テスト込みで数百行を目安にし、それより大きいタスクはプルリクエストで理由を書きます。

状態: `[ ]` 未完、`[x]` 完了。**Result** 行はそのタスクのプルリクエストで、実行したことと見たことを書いて埋めます。実行していないことは、実行したと記録しません。

順番が各段階を出荷可能に保つ理由（REQ-5.15）: 2.1 は規則を足すが、どこからも届かない。3.1 がそれを検査する。4.1 は言葉を足すが使わない。5.1 は画面のロジックを足すが描かない（knip はテストも使用者に数える）。6.1 が描き、タイトルのボタンを足す。小屋に行けるようになるのはこのタスクだけ。7.1 が実際のタップで遊ぶ。8.1 が記録する。6.1 より前には何も子どもに届かず、それまで試練1は手つかずです。

作成環境のスモークは、iPhone 13 のタッチプロファイルの Chromium で動かします（そこでは WebKit が起動できない）。CI が本物の WebKit を実行し、それが正です。`reviewer` と `kid-reader` エージェントのルーブリックは、エージェントを実行できないときは手で当て、どちらだったかをプルリクエストに書きます。

## このspecが置き換える古い挙動のテスト（REQ-5.15.1）

既存のテストが変わる見込みはありません。小屋のイベントは新しく、試練1のイベントは試練1では挙動が変わらず、新しい守り（`trial` が 1）は、古いテストが届くすべての状態で真だからです。変える必要が出たら、ここに旧テスト、新テスト、試練1の保証が弱まらない理由を書きます。

| 旧テスト | ファイル | 置き換えるタスク | 置き換え先 | 試練1が弱まらない理由 |
|---|---|---|---|---|
| （なし） | | | | |

## 1. Spec

- [x] 1.1 `requirements.md` とその日本語訳を書き、02 と 04 の要件（と `jp/` の写し）の先頭に範囲の注記を足す。過去の行は編集しない。
  - 要件: REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.8, REQ-5.9, REQ-5.10, REQ-5.11, REQ-5.12, REQ-5.13, REQ-5.14, REQ-5.15
  - テスト: なし（文書）。`npm run check` の `check-trace` と日本語テキストゲートが含まれる（specs は許可リストにある）。
  - Result: Node 26.13.0 で `npm run check` が通る（`git add` のあと。`check-submission.sh` が `git ls-files` を読むため。`check-trace: 15 invariants, 0 without tests`）。プルリクエスト #60: 必須のCIチェックがすべて緑（`actions`、`static`、`test`、`mutation`、`sast`、`perf`、`build`、`smoke`、`secrets`、`guard`）、マージ済み。`.kiro/specs/` の外は変えていない。

- [x] 1.2 `design.md` とこのファイルを書き、日本語訳をつける。
  - 要件: REQ-5.1, REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.8, REQ-5.9, REQ-5.10, REQ-5.11, REQ-5.12, REQ-5.13, REQ-5.14, REQ-5.15
  - テスト: なし（文書）
  - Result: Node 26.13.0 で `npm run check` が通る（`check-trace: 15 invariants, 0 without tests`。`REQ-5.n` はすべてこのファイルにあり、警告は消えた）。プルリクエスト #61: 必須のCIチェックがすべて緑、マージ済み。`.kiro/specs/` の外は変えていない。

## 2. ドメイン: 小屋の規則

- [x] 2.1 `shed.ts`（道具、`Shed`、`reduceShed`、`opensDoor`、`shedOutcome`、`triedTool`、`canGive`）、イベント `StartShed`・`PickTool`・`GiveTool`・`RetryShed`、`GameState.shed` と `trials`、`trial` の守りつきの reducer のケースを足す。INV-18〜INV-24 を、性質テストとともに同じプルリクエストで `domain-invariants.md` に足す。`src/game/` からは新しいコードを呼ばないので、ゲームは変わらない。
  - 要件: REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.9, REQ-5.13
  - 不変条件: INV-18〜INV-24（新規）。INV-3 と INV-4 を小屋のイベント込みで再実行
  - テスト:
    - `shed.test.ts`: 各段階の各イベント、3つの道具それぞれが設計の表の結果になる、置き換えた選択、選ぶことは渡すことではない、未選択での `GiveTool`、渡したあとのロック、やり直し、全道具の `opensDoor`。
    - `reducer.test.ts`（新しいケースのみ）: タイトルからだけの `StartShed`、小屋の外での小屋のイベント、小屋での `Ask`・`PickCard`・`Retry`・`Tick`、小屋での `Start` と `SetLang`、`lane` と `run` が手つかず。
    - `shed.pbt.test.ts`: 小屋のイベントを含む列での INV-3 と INV-4、INV-18〜INV-24 をそれぞれ `checkProperty` で。生成が全道具を渡し、選択を置き換え、両方の結果のあとでやり直し、成功のあとで遊び直すことのカバレッジテスト。
  - 完了の条件: ミュータントの生き残りなしで `npm run check` が通り、`check-trace` が22個の不変条件、テストなしゼロを報告し、新しい性質と単体のケースがそれぞれ、意図的に壊した reducer で失敗することが示される（下に記録）。
  - Result: Node 26.13.0 で `npm run check` が通る: テスト351件（297件に対して新規54件: `shed.test.ts` 26、`shed.pbt.test.ts` 14、`reducer.test.ts` 14）、カバレッジはすべての指標で100%、ミューテーションスコア100%（485件、生き残りなし。初回の実行でも生き残りなし）、`check-trace: 22 invariants, 0 without tests`、サイズ予算 OK。既存のテストは編集していない: `reducer.test.ts` の変更は末尾へのケースの追加。**意図的な破壊**（`shed.ts` か `reducer.ts` に適用し、4つのテストファイルを実行して元に戻した。行った破壊はこれで全部）: ハンマーも扉を開ける→4件失敗（INV-20と単体3）、`GiveTool` が常に鍵を試す→8件（INV-19、道具ごとの単体、カバレッジテスト）、試した後も `PickTool` が置き換える→4件（INV-21）、`PickTool` が試した道具を変える→3件（INV-21）、`RetryShed` が道具を選択として残す→7件（INV-21、INV-22）、小屋のイベントが試練2の外で効く→2件（INV-23）、小屋で `Tick` が時計を進める→3件（INV-24）、小屋で `PickCard` が効く→2件（INV-24）、未選択の `GiveTool` が鍵を試す→4件（INV-18、INV-19）、どの phase でも `StartShed`→1件（単体）、プレイも始める `StartShed`→2件（単体）。気づいた穴が1つ: プレイを再スタートする `StartShed` は INV-24 を緑のままにする（初期の run に `restartRun` を掛けても初期の run と等しいため）。単体テストが捕まえる。INV-3 と INV-4 は新しいイベントを含めて実行して通る。`src/game/` は変えていないので、このタスクではスモークは不要（既存の11件はここでは再実行していない）。

## 3. モデル検査

- [ ] 3.1 `shed.model.test.ts` を足す: タイトルからの入口とその先の小屋。設計のアルファベット、不変条件、ゴール、到達の証拠と、意図的な破壊とその反例。試練1のモデル検査は変えない。
  - 要件: REQ-5.6, REQ-5.13
  - テスト: `shed.model.test.ts`: 到達した状態数、不変条件が成り立つ、ゴール1〜3、鍵の `open`・ほうきの `shut`・ハンマーの `shut` がそれぞれ到達可能（最短トレース）、`shut` の結果から新しい選択に戻れる、意図的な破壊がそれぞれ反例つきで失敗する。
  - 完了の条件: `npm run check` が通る。Result に状態数と反例を書く。
  - Result: そのタスクのプルリクエストで埋める

## 4. 文言

- [ ] 4.1 両方の文字列ファイルに `shed` グループを足し、サブセットフォントを再生成し、`shed-content.test.ts` を足す。新しいキーはまだ誰も読まない。締めの文の言葉は、kid-reader のルーブリックで、ここで決める。
  - 要件: REQ-5.1, REQ-5.6, REQ-5.8, REQ-5.12。引き継ぎ REQ-2.9, REQ-2.13, REQ-3.6
  - テスト: `shed-content.test.ts`: 両言語で同じキー、`{0}` は `ready`・`open`・`shut`・`lesson` に1つずつでほかにはない、4つすべてで全道具名の日本語ルール、英語の行は最大24字（メッセージ）と20字（締めの文）、非難語なし、本物のAI・本物の鍵・パスワードについての主張なし、締めの文は open のメッセージと文を共有しない、`ready` と `pick` は2つ目の道具を匂わせない。`npm run kid` と `npm run font` が通る。
  - 完了の条件: `npm run check`、`npm run kid`、`npm run font` が通る。kid-reader の表がプルリクエストにあり、エージェントか手動ルーブリックかが書いてある。
  - Result: そのタスクのプルリクエストで埋める

## 5. view とレイアウト

- [ ] 5.1 `shed-layout.ts`、`shed-view.ts`、`route.ts` を単体テストとともに足す。シーンからはまだ呼ばない。
  - 要件: REQ-5.2, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.8, REQ-5.9, REQ-5.10。引き継ぎ REQ-2.10
  - テスト: `shed-view.test.ts`（段階と言語ごと: メッセージ、ボタン、armed、道具、印、絵、open のときだけ締めの文、ウィスプの目標、メッセージ中の道具名が試した道具と等しい、3つの道具すべて）、`shed-layout.test.ts`（キャンバス内、段階ごとに重ならない、対象は80以上、ヒーローの帯が空いている、測定点が絵の中）、`route.test.ts`（すべての phase と trial での `sceneFor`）。
  - 完了の条件: ミュータントの生き残りなしで `npm run check` が通る。
  - Result: そのタスクのプルリクエストで埋める

## 6. シーンと入口

- [ ] 6.1 小屋を描き（`ui/shed-art.ts`、`ui/cat.ts`、`ui/tools.ts`、`ui/tool-card.ts`、`shed-palette.ts`）、`ShedScene` を足して登録し、タイトルに「押下がオブジェクトに当たらなかった」守りと `sceneFor` つきの小屋ボタンを足す。
  - 要件: REQ-5.1, REQ-5.2, REQ-5.5, REQ-5.9, REQ-5.10, REQ-5.11。引き継ぎ REQ-4.9, REQ-4.11
  - テスト: シーンは単体テストの対象外（ADR 0003）。`npm run check`、`npm run build`、既存のスモーク11件が通る（試練1とスコアアタックは変わらない）。組み上げたページを実際のタップで動かし、両言語と3つの道具すべてをスクリーンショットで見る。
  - 完了の条件: 上記と、スクリーンショットを読んだこと。
  - Result: そのタスクのプルリクエストで埋める

## 7. スモーク

- [ ] 7.1 小屋のスモークを足す: `e2e/shed-helpers.ts`、`smoke.mobile.shed.spec.ts`、`smoke.desktop.shed.spec.ts`、`e2e/helpers.ts` の `GameState` 型の `shed` フィールド。
  - 要件: REQ-5.1, REQ-5.3, REQ-5.4, REQ-5.5, REQ-5.6, REQ-5.7, REQ-5.8, REQ-5.9, REQ-5.10, REQ-5.12, REQ-5.14。引き継ぎ REQ-2.12
  - テスト: モバイル、実際のタップ: 道具なしでウィスプをタップ、ほうき→渡す→shut→やり直し→鍵→open→鍵の名前→締めの文、ハンマー→渡す→shut→やり直し→鍵→open→締めの文、置き換えた選択、結果中のロック、成功後の遊び直し、扉・猫・道具名・締めの文のピクセル、jaとenのスクリーンショット、両言語でのオフライン。デスクトップ、マウス: 同じ流れ、道具の上で押し続けてもヒーローは動かない。
  - 完了の条件: `npm run check`、`npm run build`、`npm run smoke` が通る（ここでは Chromium。CI は WebKit を実行）。新しいテストが、シーンを意図的に壊すと失敗することが示される。
  - Result: そのタスクのプルリクエストで埋める

## 8. 最終統合

- [ ] 8.1 変更を記録する: `CHANGELOG.md`、`docs/learning-design.md` の試練2の行、このファイルの Result 行。マージ済みの `main` で、もう一度すべてを実行する。
  - 要件: REQ-5.13, REQ-5.14, REQ-5.15。引き継ぎ REQ-2.15, REQ-3.9, REQ-4.8
  - テスト: `npm run check`、`npm run build`、`npm run smoke`、`npm run mutation`。試練1のスモーク（スコアアタックを含む）は変わらず緑。
  - 完了の条件: 最終プルリクエストで CI の `smoke`（WebKit）が緑。それまでは完了と呼ばない。
  - Result: そのタスクのプルリクエストで埋める
