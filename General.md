# Scratch データ構造ジェネレーター 仕様書

**プロジェクト名:** Scratch DS Generator  
**デプロイ先:** GitHub Pages（静的サイト）  
**出力形式:** `.sb3`（Scratch 3.0 プロジェクトファイル）  
**技術スタック:** HTML / CSS / Vanilla JS / JSZip

-----

## 1. 概要

ユーザーが使いたいデータ構造を選択・命名し、ボタン1つで `.sb3` ファイルを生成・ダウンロードできるWebツール。
生成された `.sb3` を Scratch 3.0 にインポートすると、各データ構造が **スプライト1体** として追加され、カスタムブロックとして操作できる。

-----

## 2. UI仕様

### 2-1. 画面構成

```
┌─────────────────────────────────────────────────┐
│  HEADER: Scratch DS Generator                   │
├─────────────────────────────────────────────────┤
│  ① データ構造 選択パネル（左）                      │
│  ② 追加済みリスト（右）                            │
├─────────────────────────────────────────────────┤
│  ③ 生成ボタン  →  .sb3 ダウンロード               │
└─────────────────────────────────────────────────┘
```

### 2-2. ① データ構造 選択パネル

- データ構造カードが一覧で並ぶ
- 各カードに表示する情報：
  - データ構造名（例: `Dictionary`）
  - 代表操作の計算量（例: `get/set: O(1)`）
  - 短い説明（1行）
- カードをクリック → ② 追加済みリストに追加

### 2-3. ② 追加済みリスト（エントリーリスト）

各エントリーは以下のフィールドを持つ：

|フィールド    |説明                      |例                |
|---------|------------------------|-----------------|
|`スプライト名` |Scratch上のスプライト名（ユーザー編集可）|`PlayerInventory`|
|`データ構造種別`|選択されたデータ構造              |`Dictionary`     |
|`削除ボタン`  |リストから除外                 |🗑                |

- 同じデータ構造を複数追加可能（スプライト名で区別）
- スプライト名はデフォルトで `{データ構造名}1`, `{データ構造名}2` … と自動採番

### 2-4. ③ 生成ボタン

- ラベル: `▶ .sb3 を生成してダウンロード`
- エントリーが0件のとき: disabled
- クリック時: `{スプライト名}_ds.sb3` をダウンロード
- 複数エントリーは **1つの `.sb3`** にまとめて出力（スプライト複数）

-----

## 3. 対応データ構造

### 3-1. デフォルト収録リスト

|ID              |表示名           |計算量ハイライト                 |説明              |
|----------------|--------------|-------------------------|----------------|
|`dictionary`    |Dictionary    |get/set: O(1)            |キーで値を管理するマップ    |
|`hashset`       |HashSet       |contains: O(1)           |重複なし集合、存在確認が速い  |
|`priority_queue`|Priority Queue|push/pop-min: O(log n)   |常に最小値を素早く取り出す   |
|`deque`         |Deque         |push/pop both ends: O(1) |両端キュー           |
|`union_find`    |Union-Find    |find/union: O(α n) ≈ O(1)|連結成分の管理         |
|`trie`          |Trie          |search: O(m)             |前方一致・文字列検索      |
|`segment_tree`  |Segment Tree  |query/update: O(log n)   |区間クエリの高速処理      |
|`lru_cache`     |LRU Cache     |get/put: O(1)            |最近最も使われないものを自動削除|
|`bloom_filter`  |Bloom Filter  |contains: O(k) ≈ O(1)    |確率的存在確認（超高速）    |

-----

## 4. `.sb3` 生成仕様

### 4-1. `.sb3` ファイル構造

`.sb3` は以下のファイルを含む **ZIPアーカイブ**：

```
project.zip (.sb3)
├── project.json          ← メインデータ（JSON）
└── {md5hash}.svg         ← スプライトのコスチューム（SVG）× スプライト数
```

### 4-2. project.json 構成

```json
{
  "targets": [
    { /* Stage（必須） */ },
    { /* スプライト1（データ構造A） */ },
    { /* スプライト2（データ構造B） */ }
  ],
  "monitors": [],
  "extensions": [],
  "meta": {
    "semver": "3.0.0",
    "vm": "0.2.0",
    "agent": "ScratchDSGenerator/1.0"
  }
}
```

### 4-3. スプライト構成（1データ構造 = 1スプライト）

各スプライトは以下を持つ：

#### コスチューム

- SVGで生成（データ構造名と種別を描画）
- 背景色はデータ構造種別ごとに固定（視覚的区別）

|データ構造         |背景色               |
|--------------|------------------|
|Dictionary    |`#4A90E2`（青）      |
|HashSet       |`#7ED321`（緑）      |
|Priority Queue|`#F5A623`（オレンジ）   |
|Deque         |`#9B59B6`（紫）      |
|Union-Find    |`#E74C3C`（赤）      |
|Trie          |`#1ABC9C`（エメラルド）  |
|Segment Tree  |`#E67E22`（ダークオレンジ）|
|LRU Cache     |`#2ECC71`（ライトグリーン）|
|Bloom Filter  |`#3498DB`（スカイブルー） |

#### 変数（Scratch リスト）

データをScratchのリスト変数でエミュレートする。

|データ構造         |変数                                   |説明                       |
|--------------|-------------------------------------|-------------------------|
|Dictionary    |`keys` リスト, `values` リスト             |keys[i] ↔ values[i] でペア管理|
|HashSet       |`items` リスト                          |重複追加をブロックで防止             |
|Priority Queue|`heap` リスト                           |Min-Heapをリストでエミュレート      |
|Deque         |`items` リスト                          |先頭・末尾操作をカスタムブロックで抽象化     |
|Union-Find    |`parent` リスト, `rank` リスト             |パス圧縮つきUnion-Find         |
|Trie          |`nodes` リスト, `children` リスト          |フラット配列で木構造               |
|Segment Tree  |`tree` リスト                           |1-indexed 配列表現           |
|LRU Cache     |`keys` リスト, `values` リスト, `order` リスト|順序リストでLRU管理              |
|Bloom Filter  |`bits` リスト                           |ビット配列エミュレート              |

#### カスタムブロック（define ブロック）

各データ構造に操作ブロックを生成する。

**Dictionary**

```
define set key: (key) value: (value)
define get key: (key)           → answer にセット
define contains key: (key)      → answer に 1/0
define delete key: (key)
define clear
```

**HashSet**

```
define add item: (item)
define contains item: (item)    → answer に 1/0
define remove item: (item)
define size                     → answer にセット
```

**Priority Queue**

```
define push value: (value)
define pop-min                  → answer に最小値
define peek-min                 → answer に最小値（削除しない）
define size                     → answer にセット
```

**Deque**

```
define push-front value: (value)
define push-back value: (value)
define pop-front                → answer にセット
define pop-back                 → answer にセット
define size                     → answer にセット
```

**Union-Find**

```
define init size: (n)
define find node: (x)           → answer に根
define union a: (a) b: (b)
define connected? a: (a) b: (b) → answer に 1/0
```

**Trie**

```
define insert word: (word)
define search word: (word)      → answer に 1/0
define starts-with prefix: (p)  → answer に 1/0
```

**Segment Tree**

```
define build list: (list)
define query left: (l) right: (r)  → answer に区間和
define update index: (i) value: (v)
```

**LRU Cache**

```
define set-capacity cap: (n)
define get key: (key)           → answer に値（なければ -1）
define put key: (key) value: (v)
```

**Bloom Filter**

```
define init size: (n)
define add item: (item)
define might-contain item: (item)  → answer に 1/0（偽陽性あり）
```

-----

## 5. 技術実装メモ

### 5-1. JSZip でのビルド手順

```javascript
const zip = new JSZip();

// 1. SVGコスチュームを生成
const svg = generateSVG(spriteName, dsType);
const md5 = await md5Hash(svg);
zip.file(`${md5}.svg`, svg);

// 2. project.json を構築
const project = buildProjectJSON(entries, costumeMap);
zip.file("project.json", JSON.stringify(project));

// 3. ダウンロード
const blob = await zip.generateAsync({ type: "blob" });
saveAs(blob, "project.sb3");
```

### 5-2. 外部ライブラリ（CDN）

|ライブラリ       |用途           |CDN               |
|------------|-------------|------------------|
|JSZip       |ZIP生成        |`jszip.min.js`    |
|FileSaver.js|ファイルダウンロード   |`FileSaver.min.js`|
|spark-md5   |SVGのMD5ハッシュ生成|`spark-md5.min.js`|

### 5-3. GitHub Pages デプロイ構成

```
repo/
├── index.html
├── style.css
├── main.js
├── generators/
│   ├── project-builder.js    ← project.json 組み立て
│   ├── sprite-builder.js     ← スプライトJSON生成
│   ├── costume-builder.js    ← SVGコスチューム生成
│   └── ds/
│       ├── dictionary.js
│       ├── hashset.js
│       ├── priority-queue.js
│       └── ...
└── libs/
    ├── jszip.min.js
    ├── FileSaver.min.js
    └── spark-md5.min.js
```

-----

## 6. 将来拡張（スコープ外）

- カスタムデータ構造の追加（ユーザー定義ブロック入力）
- 操作のデモ用スクリプト自動生成（動作確認ブロック付き）
- Scratch プロジェクトへの直接インポート（Scratch Link 連携）
- データ構造ビジュアライザーのコスチュームアニメーション

-----

## 7. 実装フェーズ案

|フェーズ   |内容                                         |優先度|
|-------|-------------------------------------------|---|
|Phase 1|UI実装 + Dictionary / HashSet のみ対応           |★★★|
|Phase 2|Priority Queue / Deque / Union-Find 追加     |★★☆|
|Phase 3|Trie / Segment Tree / LRU / Bloom Filter 追加|★☆☆|
|Phase 4|コスチューム強化・アニメーション                           |★☆☆|