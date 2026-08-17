---
title: "模型之外：Row-based vs Columnar：為什麼 Parquet 適合 ML？"
published: 2026-08-21
description: "從掃描模式、壓縮與 schema 演進，理解 Parquet 為何常見於 ML 資料管線。"
image: "/posts/ai-infrastructure-day-05/row-vs-columnar-layout.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

上一篇我們談到，AI Pipeline 的瓶頸經常不在 GPU，而是在 Storage、CPU Preprocessing、Memory Copy 或 Network。這些問題有一個共同點：**資料怎麼被存放與讀取，會直接決定後面的系統需要搬多少資料。**

假設現在有一份一億筆資料的 Dataset，每一筆包含 `user_id`、`age`、`country`、`timestamp`、`text`、`label` 等欄位。今天的 Training Job 其實只需要 `text` 和 `label`，那系統應該把整筆資料全部從 Storage 讀進來，再丟掉不需要的欄位，還是只讀真正需要的兩個欄位？

這個問題看起來很簡單，但它直接牽涉到底層資料究竟是怎麼排列的。如果資料以 Row 為單位連續存放，那麼同一筆 Record 的所有欄位會靠在一起；如果資料以 Column 為單位排列，同一個欄位的大量 Values 則會集中存放。這就是 **Row-based Storage** 與 **Columnar Storage** 最核心的差異。

[Apache Parquet](https://github.com/apache/parquet-format/) 就屬於後者。官方將 Parquet 定義為一種針對高效率 Storage 與 Retrieval 所設計的 Open-source Column-oriented File Format，並支援多種 Encoding 與 Compression Scheme。

理解 Parquet 為什麼適合 ML，首先就得從這個「資料到底怎麼排」開始。

## 排列方式比較

先假設有一張很小的 Table：

| id | age | country | label |
| -- | --: | ------- | ----: |
| 1  |  22 | TW      |     1 |
| 2  |  31 | JP      |     0 |
| 3  |  25 | TW      |     1 |

從 Logical View 來看，不管用什麼格式，資料都是這張表。但真正寫進 Storage 時，可以有完全不同的 Layout。

Row-based 的排列方式比較接近：

```text id="ni3w4v"
1, 22, TW, 1
2, 31, JP, 0
3, 25, TW, 1
```

也就是先把 Row 1 的所有欄位存完，再存 Row 2，接著 Row 3。Columnar Layout 則會更接近：

```text id="gy47pn"
id:      1, 2, 3
age:     22, 31, 25
country: TW, JP, TW
label:   1, 0, 1
```

兩者在邏輯上完全相同，但對 Storage System 而言，它們會產生很不同的 I/O Pattern。

如果 Application 的主要需求是「一次取出一整筆 Record」，Row-based Layout 非常自然。假設我們知道 `id=2`，而且接下來要立刻拿到這個使用者的 age、country、label 和其他所有欄位，那麼把同一 Row 的資料放在一起，通常可以減少額外跳躍與重組。這也是 Transactional Database 傳統上常見 Row-oriented Storage 的原因之一。

但 Analytics 與 ML Pipeline 經常做的是另一件事情：**一次掃描大量 Rows，但只取少數 Columns。**

例如：

```sql id="qbfvkm"
SELECT age, label
FROM training_data;
```

如果 Table 有 200 個 Columns，但 Training 只需要其中 2 個，這時 Row-based Layout 就開始顯得不划算。因為每一筆 Row 的 200 個欄位都混在一起，即使我們只關心 2 個欄位，底層仍可能需要讀取大量根本不會使用的資料。Columnar Format 的優勢，就是可以直接定位到需要的 Columns，只把那些 Column 的 Bytes 從 Storage 讀進來。

![同一張 logical table 在 row-oriented layout 中以整列讀取，在 columnar layout 中則只選取 age 與 label 兩個欄位。](/posts/ai-infrastructure-day-05/row-vs-columnar-layout.png)

> 圖一：Row-based 與 Columnar 儲存的邏輯資料相同，但實體 Layout 不同；當工作只需要少數欄位時，Columnar Layout 可以避免讀取大量無關資料。

---

## Columnar 的第一個優勢：只讀需要的 Column

假設現在有一份 Dataset，共 100 個 Columns，每個 Column 的大小簡化假設都差不多。整份 Dataset 是 1 TB，而 Training Pipeline 只需要其中 5 個 Columns。

如果沒有任何額外最佳化，粗略來看，讀完整份 Dataset 代表需要從 Storage 移動接近 1 TB 的資料。但如果 Format 能真正做到 Column Projection，只讀所需的 5%，那實際需要掃描的資料量可能大幅下降。

這件事情非常重要，因為從上一篇就知道，Storage I/O 並不是免費的。資料可能在 Object Storage，經過 Network 被下載到 Worker；讀進 Memory 後還要 Decode，再送進後面的 Data Pipeline。如果最開始就讀了十倍甚至一百倍不需要的資料，那後面的 Storage Bandwidth、Network Traffic、Memory Usage 和 CPU Processing 全部都跟著浪費。

因此 Columnar Format 的價值不只是「Disk 上比較省空間」，而是能在 Data Source 就直接減少需要進入 Pipeline 的 Bytes。

[Apache Spark](https://spark.apache.org/) 的 Data Source API 對這種 Optimization 有一個很直接的名稱：[**Column Pruning**](https://www.sparkcodehub.com/spark/performance/column-pruning)。它允許 Data Source 只讀取 Query 真正需要的 Columns，以降低 Scan 時需要處理的資料量。

對 ML Pipeline 來說，這種需求非常常見。原始 Dataset 可能同時保存訓練、分析、Debug、Audit 與 Metadata 所需的欄位，但某個 Model Training Job 只需要 Features 與 Label；另一個 Embedding Job 可能只需要 `document_id` 與 `text`。如果每次都把整份 Wide Table 全部載入，Storage 與 Network 很容易成為上一篇提到的 Bottleneck。

---

## 為什麼 Columnar 通常也更容易壓縮？

Columnar Layout 的第二個優勢是 **Compression 與 Encoding 通常更有效率**。

想像一個 `country` Column：

```text id="p57ll6"
TW
TW
TW
JP
JP
TW
US
US
US
US
```

同一個 Column 裡的資料具有相同 Data Type，而且 Value Distribution 往往也存在規律。例如 `country` 可能只有幾十種值，`label` 可能只有 0 和 1，`age` 則全部都是 Integer。當同類型、相似分布的資料集中放在一起時，就很適合使用 Dictionary Encoding、Run-length Encoding、Bit Packing，然後再配合 Snappy、ZSTD 等 Compression Codec。

Parquet 本身支援多種 Encoding，其中包含 Dictionary、RLE / Bit Packing 等方式；Data Page 經過 Encoding 之後還可以再使用 Compression Codec 壓縮。

例如 `country` 如果只有 `TW`、`JP`、`US` 三種值，就可以先建立 Dictionary：

```text id="2p78ou"
0 → TW
1 → JP
2 → US
```

原本反覆保存 String 的地方，就能改成一串小型 Integer ID。假設資料是：

```text id="on060m"
TW, TW, TW, JP, JP, TW
```

Encoding 之後可能概念上變成：

```text id="n11o8f"
0, 0, 0, 1, 1, 0
```

如果又存在大量連續重複 Value，Run-length Encoding 還能進一步表示成「0 出現三次、1 出現兩次、0 出現一次」。真正的 Parquet Encoding 細節比這個例子完整得多，但核心思想就是：**相同 Column 的 Values 放在一起，更容易找到可以壓縮的規律。**

相反地，如果資料使用 Row Layout，Storage 裡可能是 Integer、String、Timestamp、Boolean、Float 不斷交錯。同一個位置附近的 Bytes 不一定具有相似分布，壓縮演算法通常比較難充分利用 Column-specific Pattern。

![row-oriented bytes 交錯不同資料型別；column-oriented layout 將 country、age、label 分開，方便使用 dictionary encoding、RLE 與 bit packing。](/posts/ai-infrastructure-day-05/columnar-encoding-compression.png)

> 圖二：同一個 Column 的資料具有相同型別與較相似的 Value Distribution，因此 Columnar Layout 通常更容易利用 Dictionary、RLE、Bit Packing 與 Compression。

---

## Parquet 並不是把整個 Column 存成一大塊

既然 Parquet 是 Columnar Format，那是不是一個 1 TB 的 Parquet File 裡，先放完整的 `id` Column，再放完整的 `age` Column，最後放完整的 `label`？

實際上不是。

Parquet 會把資料切成 **Row Groups**，再讓每個 Row Group 裡的各個 Column 形成自己的 **Column Chunk**。Column Chunk 內部又由一個個 Page 組成。Parquet 官方規格描述 Column Chunk 時，也明確指出 Column Chunk 是由多個連續 Pages 組成，而 Page 可以使用 Encoding 與 Compression；File 也可以存在可選的 Column Index，協助 Reader 更有效率地跳過不需要的 Pages。

假設我們有 100 萬 Rows 和三個 Columns：

```text id="hjj4wh"
id
country
label
```

Parquet 可以概念上切成：

```text id="irur6i"
Row Group 1
  ├── id Column Chunk
  ├── country Column Chunk
  └── label Column Chunk

Row Group 2
  ├── id Column Chunk
  ├── country Column Chunk
  └── label Column Chunk

Row Group 3
  ├── id Column Chunk
  ├── country Column Chunk
  └── label Column Chunk
```

這樣的結構同時保留兩種重要特性。一方面，同一個 Row Group 內的 Column 是分開存放，因此 Reader 可以只讀某些 Columns；另一方面，Dataset 又不是只有一個巨大 Column Block，而是被切成多個 Row Groups，因此系統可以用 Row Group 作為較粗粒度的 Scan、Parallelism 與 Skipping Unit。

[Apache Arrow](https://github.com/apache/arrow) 的 Parquet 文件與相關說明也把 Row Group、Column Chunk 與 Page 當成 Parquet File Structure 的核心組成。

![Parquet file 由多個 row group 組成；每個 row group 有 id、country、label 等 column chunk，country chunk 再由 dictionary page 與 data pages 組成。](/posts/ai-infrastructure-day-05/parquet-file-structure.png)

> 圖三：Parquet 並不是把整個 Dataset 的每個 Column 存成單一巨大區塊，而是先切成 Row Groups，再在每個 Row Group 中以 Column Chunks 與 Pages 組織資料。

## Row Group 為什麼很重要？

Row Group 可以看成 Parquet 中非常重要的一個 Horizontal Partition。假設一個 Parquet File 有一億 Rows，並不是所有 Query 都需要掃描這一億 Rows。每個 Row Group 可以保存自己的 Column Metadata 與 Statistics，因此 Reader 有機會在真正讀取 Data Page 之前，先判斷某個 Row Group 是否根本不可能包含需要的資料。

例如現在執行：

```sql id="h49goi"
SELECT text, label
FROM dataset
WHERE age > 60;
```

假設某個 Row Group 的 `age` Statistics 顯示：

```text id="9qc89v"
min = 18
max = 42
```

那就不需要讀這個 Row Group 裡的 `age` Values 才知道結果。因為它的最大值只有 42，顯然不可能符合 `age > 60`。整個 Row Group 就有機會直接被 Skip。

這就是 **Predicate Pushdown / Data Skipping** 背後的重要概念之一。Filter 不一定要等所有資料都 Decode 成完整 Rows 之後才執行，而可以盡量往 Storage Reader 推，利用 Metadata 提前排除不需要讀取的資料。Column Statistics、Dictionary 等資訊可以被用於 Predicate Pushdown；Spark 也提供 Parquet Filter Pushdown，讓 Filter 能夠在 Scan 階段協助降低需要讀取的資料量。

要注意的是，「Predicate Pushdown」並不代表任何 `WHERE` Condition 都一定能讓 Storage 完全不讀資料。這取決於 Filter 類型、Reader Implementation、Statistics 是否存在、資料分布、Row Group Layout，以及是否能利用 Page Index、Bloom Filter 等 Metadata。但從 Systems 的角度來看，方向是一樣的：**能在越靠近 Storage 的地方排除資料，就越少 Bytes 需要進入後面的 Pipeline。**

## Column Pruning 和 Predicate Pushdown 不一樣

這兩個詞很常一起出現，因此也很容易被混淆。

假設 Query 是：

```sql id="ohqrw7"
SELECT text, label
FROM dataset
WHERE country = 'TW';
```

這裡其實存在兩個完全不同的最佳化問題。

第一個是：我們到底需要哪些 Columns？Query 只需要 `text`、`label` 和用來 Filter 的 `country`，所以其他像 `age`、`device`、`embedding`、`timestamp` 等 Columns 沒必要被 Scan。這是 **Column Pruning / Projection Pushdown**（如果你有修過資料庫系統，應該會有些許印象）。

第二個是：我們到底需要哪些 Rows？如果某些 Row Groups 的 `country` Statistics 或其他 Metadata 可以確定不包含 `TW`，它們就可以整個被跳過。這是 **Predicate Pushdown / Data Skipping**。

兩者可以同時發生。假設 Dataset 原本有 100 Columns、1 TB，Column Pruning 先讓 Reader 只需要看其中 3 個 Columns，而 Predicate Pushdown 又排除其中 80% Row Groups，那真正從 Storage 搬進來的資料可能比「完整 Scan 1 TB」小非常多。

![dataset grid 中 column pruning 跳過不需要的欄位，predicate pushdown 根據 country 等 metadata 跳過不符合的 row groups。](/posts/ai-infrastructure-day-05/column-pruning-predicate-pushdown.png)

> 圖四：Column Pruning 減少需要讀取的欄位，Predicate Pushdown 則利用條件與 Metadata 減少需要掃描的資料區域；兩者共同降低 Storage I/O。

## 這和 ML 到底有什麼關係？

到這裡可能會覺得，我們好像一直在談 Database Query Optimization，而不是 Machine Learning。但其實**現代 ML Pipeline 的前半段，本來就非常像 Analytics Workload。**

假設今天要訓練一個推薦系統模型。Feature Store 或 Data Lake 裡可能有幾百個 Features，但某個實驗只使用其中 40 個；Dataset 有過去五年的資料，但這次只訓練最近 90 天；資料還可能先 Filter 掉某些 Region、User Segment 或 Invalid Sample。這個過程本質上就是大量 Scan、Projection、Filter、Transform 與 Aggregate。

又或者要做 LLM Fine-tuning，Data Lake 裡可能包含：

| 欄位              | 用途                     |
| --------------- | ---------------------- |
| `document_id`   | Metadata               |
| `source`        | Dataset provenance     |
| `language`      | Filter                 |
| `created_at`    | Filter                 |
| `raw_text`      | Original content       |
| `clean_text`    | Training input         |
| `token_count`   | Length filtering       |
| `quality_score` | Quality filtering      |
| `embedding`     | Retrieval / clustering |
| `license`       | Compliance             |

真正 Fine-tuning 時可能只需要 `clean_text`，再用 `language`、`quality_score` 與 `token_count` 做 Filter。如果 Dataset 以適合 Column Projection 的格式保存，就不用每次把巨大的 `embedding`、`raw_text` 或其他 Metadata 一起讀進來。

所以 Parquet 特別適合的不是「Machine Learning Model」本身，而是 **Machine Learning 前面那套大規模 Data Processing Workload**。

這也是為什麼 Parquet 會大量出現在 Data Lake、Feature Engineering、ETL、Batch Inference 與 Training Dataset Pipeline 裡。它的優勢和 DataFrame / SQL 類型的 Access Pattern 非常契合：一次處理大量 Records、常常只需要部分 Columns，而且經常需要 Filter。

## Parquet 適合 ML，不代表它適合所有 ML 操作

但 **Parquet 適合 ML Data Pipeline，不代表所有 ML Data 都應該直接用 Parquet，也不代表 Parquet 永遠最快。**

如果你的 Access Pattern 是頻繁地按照 Primary Key 讀取單一 Record，例如：

```text id="d1prk5"
give me user_id = 12345
```

那麼一個有 Index 的 Row-oriented Database 或 Key-value Store 往往更適合。如果 Workload 是大量小型 Random Updates，Parquet 也不是為這種 Transactional Mutation 所設計。Parquet 更偏向 Immutable 或 Append-oriented 的 Analytical File Format，適合 Batch Scan，而不是把它當成 OLTP Database。

另外，如果 ML Dataset 的主要內容是大型 Binary Object，例如高解析度 Image、Video 或 Audio，也不代表把所有 Raw Media 直接塞進單一 Parquet File 就一定最好。實際系統可能把 Binary Object 放在 Object Storage，再在 Parquet 裡保存 URI、Label、Metadata；也可能基於 Workload 使用 WebDataset、TFRecord、MDS 或其他 Format。真正的 Format Choice 仍然要回到 Access Pattern，而不是「ML 就用 Parquet」。

還有一點非常重要， **Columnar Format 的好處主要出現在只讀少部分 Columns、可以利用 Compression / Encoding，或能進行 Data Skipping 的情境。** 如果每次 Training 都真的需要完整讀取每一個 Column、每一個 Row，那 Column Pruning 的優勢自然就會降低。這時 Format 是否適合，還要一起考慮 Decode Cost、File Size、Parallelism、Compression Codec 與下游 Framework。

因此：

> **Parquet 的 Columnar Layout、Encoding、Compression 與可選擇性讀取能力，非常符合許多大規模 ML Data Pipeline 的 Access Pattern。**

## Row Group Size 也不是越大越好

既然 Row Group 可以提供 Scan 與 Data Skipping 的單位，那是不是切得越小越好？倒也不一定。

Row Group 太大時，每次讀取的 Chunk 也較大，Parallelism 和 Fine-grained Data Skipping 的彈性可能下降。例如一個超大的 Row Group 同時包含 `country=TW`、`JP`、`US` 等資料，其 `country` 的 Statistics 可能只會告訴我們範圍涵蓋很多值，因此 Filter 很難整組 Skip。

但如果 Row Group 切得非常小，也會產生更多 Metadata、更多 I/O Request 與更多 Scheduling Overhead。假設每個 Row Group 只有非常少的資料，Distributed Execution Engine 可能要處理大量 Tiny Tasks，Storage 又需要進行大量小型 Read，反而回到上一篇提到的 Task Granularity 與 Small I/O 問題。

所以 Row Group Size 本質上也是一個 Trade-off：要在 Sequential I/O、Compression、Metadata Overhead、Parallelism 與 Data Skipping Granularity 之間取得平衡。Apache Arrow 的 Parquet API 也會把 Row Group 當成可以獨立讀取與平行處理的單位。

這個觀念之後到了 Distributed Execution 還會再次出現。資料切得太大，無法有效平行；切得太小，Scheduling Overhead 又過高。Data Partition Size 幾乎永遠不是「越小越好」或「越大越好」。

## Compression 也存在 CPU 與 I/O 的 Trade-off

Parquet 支援多種 Compression Codec，但 Compression 並不是免費的。把資料壓得越小，可以降低 Storage Capacity 與 Network I/O，但 Worker 讀取之後必須花 CPU Cycle Decompress。

假設未壓縮 Dataset 是 1 TB，而壓縮後只剩 300 GB。對 Object Storage 與 Network 來說，顯然只傳 300 GB 比傳 1 TB 便宜很多。但如果選擇一個 Compression Ratio 很高、Decompression Cost 也很大的 Codec，而你的 Pipeline 原本就是 CPU-bound，那最後反而可能讓 CPU Preprocessing 變得更慢。

因此 Compression 的 Trade-off 可以理解成：**花 Compute 換取更少的 Data Movement。**

在 Storage / Network 成為 Bottleneck 時，較好的 Compression 很可能帶來整體 Performance 提升；但在 CPU 已經非常緊張、Storage 又很快的情況下，過度 Compression 未必划算。Parquet 官方也提供多種 Codec，正是因為不同 Codec 在 Compression Ratio 與 Processing Cost 之間存在不同取捨。

這裡再次呼應 Day 04 的 **不要只看單一 Component。File 變小不代表 End-to-end Pipeline 一定更快，真正要看的仍然是整條 Critical Path。**

## Parquet 解決的是 Storage Layout，並不是 In-memory Layout

這裡還要特別區分兩個很容易混在一起的名字：**Apache Parquet** 和 **Apache Arrow**。

Parquet 主要是一種 **Storage File Format**。它關心的是資料如何有效率地寫到 Disk / Object Storage，如何 Compression、Encoding，以及 Reader 如何透過 Row Group、Column Chunk 與 Metadata 選擇性讀取資料。

Arrow 則主要定義 **In-memory Columnar Format**。也就是資料已經從 Storage 讀進 Memory 後，應該用什麼 Layout 表示，才能讓不同 System 更有效率地共享與處理資料。

所以一個常見的資料路徑可能是：

```text id="4z687j"
Object Storage
    ↓
Parquet
    ↓
Decode
    ↓
Arrow RecordBatch
    ↓
Data Processing
    ↓
Tensor
    ↓
GPU
```

Parquet 處理的是「Storage 怎麼放比較有效率」，Arrow 則開始處理「Memory 裡怎麼表示比較有效率」。

這兩者都使用 Columnar 的思想，但它們解決的是不同 Layer 的問題。

而這剛好就是下一篇真正要討論的主角。

## 回到 AI Infra

從 Day 04 的角度重新看 Parquet，就會發現它和 AI Infra 的關係其實非常直接。

假設一個 10 TB Dataset 只有 10% Columns 是這次 Training 需要的。如果 Column Projection 能讓 Reader 不去讀剩下 90%，那節省的不是只有 Storage Read。那些資料也不用經過 Network、不用進 Worker Memory、不需要 Decompress、不需要 Convert 成 DataFrame，更不會占用後續 Object Store 或 Batch Buffer。

如果 Predicate Pushdown 又能排除一半 Row Groups，那進入整條 Data Pipeline 的資料量就可能再降低。

也就是說，很多 Performance Optimization 最有效的方法根本不是：

> 怎麼讓 GPU 處理資料更快？

而是：

> **怎麼讓不需要的資料從一開始就不要進入系統？**

這是 Columnar Storage 真正重要的地方。

它把 Optimization 的位置往前推到了 Storage Layer。與其把 10 TB 全部讀出來，再用 100 台 Worker 很快地丟掉 9 TB，不如一開始就只讀真正需要的 1 TB。

這也符合整個 AI Infra 系列我想強調的事情。**Data Movement 很昂貴，而最便宜的 Data Movement，就是不要移動。**

今天我們先從 Disk / Object Storage 的角度看了這件事情。Parquet 透過 Columnar Layout、Row Group、Column Chunk、Encoding、Compression 與 Metadata，讓 Analytical / ML Workload 可以避免讀取大量不必要的資料。

但資料一旦真的從 Parquet 被讀進 Memory，新的問題馬上又出現：不同 Framework 之間是不是又要把這些資料 Serialize、Deserialize、Copy 一次？Pandas、NumPy、Spark、Ray 甚至其他語言的 Runtime，要怎麼交換一份 Table，而不是每經過一個系統就重新建立一份？

這就是下一篇要處理的問題：**Apache Arrow 與 Zero-Copy 到底在解決什麼？**
