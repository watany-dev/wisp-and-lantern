# タスク: 試練6「The Hollow Crown」

> 和訳です。**正本は英語版** [`../tasks.md`](../tasks.md) です。英語版を変えたら、同じPRでこのファイルも直します。識別子・パス・コマンド・要件ID・不変条件IDは原文のままです。Result の数値は英語版と同じ実測値です。

ブランチとプルリクエストは1タスクにつき1つです（`AGENTS.md`）。spec 08 と同じく、この spec は1つのセッションの1つのブランチ（`09-trial-hollow-crown/trial-6`）で作り、1つのプルリクエストにします。ユーザーが spec と試練全体をいっしょに求めたこと、domain・view・シーンがイベントで一致して初めてビルドが通ることが理由で、プルリクエストにもそう書きます。どのタスクもゲームを動く状態に保ち、`npm run check` を通します。入力と画面をつなぐタスクは、`npm run build` のあと `npm run smoke` も通します。

状態：`[ ]` 未着手、`[x]` 完了。**Result** には、走らせたものと見たものを書きます。走らせていないものは走らせたと書きません。

順番で各段階を出荷可能に保つ方法（REQ-9.17）：2.1 は規則を足すがどこからも届かない。3.1 はそれを確かめる。4.1 は言葉を足すが使わない。5.1 は画面のロジックを描かずに足す（knip はテストを使い手と数える）。6.1 が描いてタイトルを変える、試練6に届く唯一のタスク。7.1 が本物のタップで遊ぶ。8.1 が記録する。6.1 までは子どもに届くものはなく、試練1〜5にも触れません。

作業用サンドボックスの既定は Node 22 で、リポジトリには Node 26（`.nvmrc`）が要るので、下の結果はすべて `scripts/setup-session.sh` が `.cache/node` に入れた Node 26.13.0 で出したものです。ここでは WebKit が起動しないので、モバイルのスモークは `.cache/` のコミットしないローカル設定で Chromium の iPhone 13 タッチプロファイルで走らせました。正とするのは CI の WebKit です。`reviewer` と `kid-reader` のエージェントの基準は手で当て（エージェントは走らせていません）、プルリクエストにそう書きます。

## この spec が変える古い振る舞いのテスト（REQ-9.17.1）

試練1〜5のテストは消しておらず、しきい値も不変条件も変えていません。

| 古いテスト | 新しいテスト | 試練1〜5が弱くならない理由 |
|---|---|---|
| `lantern-layout.test.ts` の「名前・カード・絵を88ピクセル上へ動かし、4つのボタンを絵の下に保つ」：名前 y 62、カード 340 x 144 で y 194、案内 y 160、ルール y 222 | 同じテスト（名前は「名前・カード・絵を上へ動かし…」）で、y 34、340 x 128 で y 128、y 96、y 154 に固定 | 試練6のボタンをカードと絵のあいだに入れるため、名前とカードを動かした（REQ-9.1.1）。同じテストはいまも `titleArtBottom` を426に固定し、絵が4つのボタンより上で終わることを確かめる。続くテスト（名前はカードの上、カードは絵の上で、どのボタンとも100ピクセル以上離れる、タイトルの真ん中はどのボタンにも入らない）と `field-layout.test.ts` のタイトルのテストは変えずに通る。`crown-layout.test.ts` が絵、4つのボタン、5つ目を固定する |
| `title-view.test.ts` の「各言語のタイトルの言葉」 | 5つ目のボタンのラベルとキャプションを足した同じテスト | 期待を足しただけ |
| `reducer.test.ts`、`route.test.ts` | 試練6のケースを後ろに足した同じファイル | 上のケースはバイト単位で同じで、新しい `describe` はそのあと |
| `e2e/helpers.ts` の `GameState` 型 | `crown` を足した同じ型 | 型だけ |

`reducer.ts` の `tick` は、試練6が加わった `trials` のすべての値ではなく、`timed`（試練1〜5）の試練で時計を進めます。試練1〜5ではこれまでと同じで、INV-15〜INV-17 とそのテストは変えずに通ります。`ui/field-buttons.ts` は試練6の操作のために `drawIcon` を export します。試練3〜5の絵と振る舞いは変わらず、そのスモークも通ります。

## 1. spec

- [x] 1.1 `requirements.md`、`design.md`、`tasks.md` と `jp/` の和訳を書き、08 の要件（と `jp/` の写し）の先頭に範囲の注記を足す。ほかの spec の過去の行は書き換えない。
  - 要件：REQ-9.1〜REQ-9.17
  - テスト：なし（文書）。`npm run check` に `check-trace` と日本語のゲートが含まれる（spec は許可リストにある）。
  - Result：`npm run check` が通る（8.1）。`check-trace` は70の不変条件を数え、プロパティテストのないものはない。英語版を先に書き、作る途中でよりよい規則が見つかったところは直した（みるボタンとクリアの言葉、ランプの行とあかりのカード、町のランプ。`docs/evidence/didnt-work.md`）。和訳は最終の英語から書き、設計は spec 08 と同じく短い形にした。

## 2. domain：規則

- [x] 2.1 `src/domain/crown.ts`、10のイベント、`GameState.crown`、`trials.crown`、reducer の `startCrown` と `leaveCrown` を足す。`Tick` は試練1〜5だけで進め、`Start` はクラウンを捨てる。`.kiro/steering/domain-invariants.md` に INV-63〜INV-74 を足す。
  - 要件：REQ-9.3、REQ-9.4、REQ-9.5、REQ-9.6、REQ-9.7、REQ-9.9、REQ-9.10、REQ-9.11、REQ-9.15.1
  - テスト：`crown.test.ts`、`reducer.test.ts`（試練6のケースを追加）、`crown.pbt.test.ts`
  - Result：すべて通る。`crown.test.ts` 31件、`reducer.test.ts` 全188件、`crown.pbt.test.ts` 18件。run のプロパティ（INV-71）は試練6で始まるか終わるステップで判定し（#81 の流儀）、全体のプロパティ INV-1〜INV-4 と INV-72 は、すべての試練のイベントを含む生成器のすべてのステップで判定する。`crown.ts` と `reducer.ts` のカバレッジは100%。`crown.ts`・`crown-view.ts`・`crown-layout.ts` への Stryker で `crown.ts` に2つのミュータントが残った（ひみつの id の確認と「何も指していない」の確認で、状態のほかの部分があれば不要だった）。どちらの確認も外し、100.00 になった。

## 3. モデル検査

- [x] 3.1 `crown.model.test.ts` を足す。実際の reducer を、子どもがしたことの独立した記録で包む。
  - 要件：REQ-9.3、REQ-9.10.6、REQ-9.15.4
  - テスト：`crown.model.test.ts`
  - Result：18件すべて約6秒で通る。状態は10,284で、何も捨てず、何も抽象化していない。どの状態からも「なおす」段、灯ったランプ、クリア、タイトルに行け、戻り道なしでもクリアに行ける。最短は「なおす」まで7、灯るまで10、クリアまで31のイベント。わざと壊した10の規則は、それぞれ気づくべき検査で失敗する。「Tick が時計を動かす」は、数える時計だと100,000状態を超えるので、時計を30秒に固定し、試練6のイベントと Tick 1つで走らせる。

## 4. content

- [x] 4.1 `strings.ja.json` と `strings.en.json` に `crown` グループと content のテストを足し、`npm run kid` と `npm run font` を走らせる。
  - 要件：REQ-9.1.6、REQ-9.8、REQ-9.14、REQ-2.9、REQ-2.10、REQ-2.13、REQ-3.6、REQ-7.4、REQ-7.6、REQ-8.7
  - テスト：`crown-content.test.ts`
  - Result：`crown-content.test.ts` 22件が通り、`npm run kid` も通る。`npm run font` はサブセットフォント（352のコードポイント）を変えなかった。新しい文字はすでに含まれている。試練5の責める言葉のリストに当たった言葉（"Not the same"、"Look again"、"What should it make?"、"You used it all"、日本語の「もういちど」「ぜんぶ」）は、リストではなく言葉を変えた。試練6のリストには "dark"、"protect"、"safe"、日本語の「くらい」「てき」「まもってくれ」、そしてどこにも `ちがう` を使わないことを足した。kid-reader の基準は手で当てた。

## 5. view と配置

- [x] 5.1 `crown-view.ts` と `crown-layout.ts` を足す。タイトルの5つ目のボタンと言葉、シーンの選択を足し、タイトルの名前とカードを上げ、カードを低くする。
  - 要件：REQ-9.1、REQ-9.2、REQ-9.3、REQ-9.4、REQ-9.5、REQ-9.6、REQ-9.7、REQ-9.9、REQ-9.10、REQ-9.11.2、REQ-9.12、REQ-9.14.4
  - テスト：`crown-view.test.ts`、`crown-layout.test.ts`、`title-view.test.ts`、`route.test.ts`、`lantern-layout.test.ts`
  - Result：すべて通る。`crown-view.test.ts` 18件、`crown-layout.test.ts` 18件と、変えたタイトルと route のテスト。カバレッジは100%。最初の view と配置に Stryker で5つのミュータントが残り、テストでそれぞれを固定して 100.00 になった。

## 6. シーンと入口

- [x] 6.1 `CrownScene`、クラウンの絵、段の列、ステージ、操作の部品、タイトルの入口を足し、シーンを登録する。
  - 要件：REQ-9.1、REQ-9.2、REQ-9.3、REQ-9.9、REQ-9.10、REQ-9.12、REQ-9.13、REQ-4.9、REQ-4.11
  - テスト：専用のものはなし（シーンと `ui/` はカバレッジとミューテーションの対象外、ADR 0003）。7.1 のスモーク
  - Result：`npm run build` が通る。両方の言語のスクリーンショットを目で見た。最初の案から、ほしいランプの光がパネルの下にはみ出していたので行を上げ、ウィスプの光が3つ目の町のランプにかかっていたので町のランプを左へ動かし、段の言葉がチェックに触れていたので右へ寄せて小さくした。

## 7. スモーク

- [x] 7.1 本物のタップとクリックで試練6を遊び、絵をピクセルから読む。
  - 要件：REQ-9.1.3、REQ-9.1.6、REQ-9.2〜REQ-9.7、REQ-9.9、REQ-9.10、REQ-9.12.3、REQ-9.12.5、REQ-9.13、REQ-9.16
  - テスト：`smoke.mobile.crown.spec.ts`、`smoke.desktop.crown.spec.ts`
  - Result：Chromium の iPhone 13 タッチプロファイルとデスクトップ Chromium で、スモーク64件すべて（既存54件と新規10件：モバイル8、デスクトップ2）が1ワーカーで11.6分で通る（最終ビルド）。最初の実行での失敗は2か所で、どちらもゲームではなく読み取りの問題だった（あかりのカードのバッジをやねのカードの下端ごと読んでいた、デスクトップで4ピクセルの枠が読めなかった）。走らせていないもの：WebKit、実機、毎週のデバイス確認、既定の2ワーカーの実行。

## 8. 最後の統合

- [x] 8.1 変更履歴、学習設計（試練6の行、L1–L5）、チェックリスト、証拠、steering の不変条件に試練6を記録し、チェック全体を走らせる。
  - 要件：REQ-9.17、REQ-9.8、REQ-9.14、REQ-9.15、REQ-4.9、REQ-4.11、REQ-2.12、REQ-2.15、REQ-3.9、REQ-5.15、REQ-6.14、REQ-7.14、REQ-8.16
  - テスト：`npm run check`
  - Result：Node 26.13.0 で `npm run check` が通る（exit 0）。整形・lint・型、knip、60ファイル1,357件のテスト、カバレッジ100%（文 940/940、分岐 612/612、関数 297/297、行 804/804）、`npm run verify`（70の不変条件）、Stryker（2,256 killed、5 timed out、0 survived、0 errors、100.00、25分17秒）、本番ビルド、gzip の JS 376.6 KB / 1,024 KB。ShellCheck は `lint-shell.sh` がスキップ（バイナリも Docker もない。CI が走らせる）。最初の全体実行は `e2e/crown-helpers.ts` の使われない export で knip が止め、それを消した。通った実行のあとに変えたのは tasks と和訳だけ。走らせていないもの：`npm audit`、Semgrep、gitleaks、zizmor、zghalint、`perf`（ネットワーク・Docker・base ブランチが要る）、CI の WebKit のスモーク。CI のスモークが緑になるまで完了とは呼ばない。
