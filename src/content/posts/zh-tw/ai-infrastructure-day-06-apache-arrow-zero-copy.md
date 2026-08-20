---
title: "模型之外：Apache Arrow 與 Zero-Copy 到底在解決什麼？"
published: 2026-08-22
image: "/posts/ai-infrastructure-day-06/arrow-int32-memory-layout.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

上一篇我們從儲存格式理解 Parquet。透過 columnar layout、row group、column chunk、encoding 與 compression，Parquet 讓系統只讀需要的資料，不必每次都把整份 dataset 載入記憶體。資料一旦離開儲存層，問題就變成：**它進入記憶體後，應該以什麼形式存在？**

假設 Spark 讀入 Parquet dataset 後，資料依序交給 Python 做 feature engineering、Ray Data，再送進 NumPy 或 PyTorch。若每個系統都轉成自己的內部表示，資料便會反覆經歷 serialization、deserialization、buffer allocation 與 memory copy。

真正昂貴的地方，往往不是某一次 copy 本身，而是這種轉換出現在整條資料管線的每一個邊界。當資料只有幾 KB 時，我們幾乎感覺不到差異；但如果每個 worker 每秒都處理數百 MB，整個 cluster 又有數百個 worker，「只是 copy 一次」很快就會變成大量 CPU 運算、記憶體頻寬消耗與尖峰記憶體用量。

[Apache Arrow](https://github.com/apache/arrow) 想解決的，就是這個問題。Arrow 定義了一套**語言無關的欄式記憶體格式**，讓不同系統可以對「一張 table 在記憶體裡應該長什麼樣子」有共同理解。官方將 Arrow 描述為適合快速資料交換與 in-memory analytics 的通用 columnar format，並把 zero-copy shared memory 與跨語言資料交換列為核心能力。

今天聚焦的是資料進入記憶體後的表示方式：**怎麼讓 CPU 有效率地處理資料，又避免跨系統時反覆重建？**

## 為什麼各系統各自的資料表示很貴？

假設一套 pipeline 中有 system A 和 system B。system A 的資料表示方法是自己的 internal object，system B 完全不理解。A 要把資料交給 B 時，就需要先 serialize 成某種中介格式，再由 B deserialize，最後建立自己的 objects。

資料流可能變成 `A objects → serialize → bytes → deserialize → B objects`。這裡至少發生兩類成本：第一類是 CPU 必須真正執行 serialization／deserialization；第二類則是記憶體可能需要同時存在 source object、serialized buffer 與 destination object。也就是說，資料交換不只花時間，還可能短暫把記憶體用量放大。

如果接著還有 system C，事情可能再做一次。對一個資料管線而言，最糟糕的情況不是某個 operator 計算太慢，而是 operator 中間不斷花時間把同一份資料換包裝。

Arrow 的想法不是「發明另一個更快的 serializer」而已，而是更進一步：**如果 producer 和 consumer 都知道同一套記憶體 layout，consumer 有沒有可能直接讀 producer 已經存在的 buffer？**

Arrow 改變了資料交換的問法：不是把 A 的 object 轉成 B 的 object，而是在格式相容時，讓兩端都對同一組 buffer 建立 view。Arrow C Data Interface 的目的之一，就是讓不同 runtime 能交換 Arrow data 的描述，而不用強迫雙方使用同一套 Arrow library implementation。Apache Arrow 官方也將它描述成跨語言、跨 runtime 的 zero-copy data sharing 機制。

## Arrow 真正定義的是一組 Buffer

要理解 Zero-Copy，不能只停在「Arrow 是 Columnar」這句話，而要稍微往 Memory Layout 裡面走。

假設我們有一個 Integer Column：

```text
age = [22, 31, null, 25]
```

直覺上，它像四個 value。實際上，Arrow Array 不是 Python list，而是一組具有既定 layout 的 buffer 與 metadata。固定寬度的 primitive type 通常有 values buffer；nullable type 另有 validity bitmap。Arrow format 會依 data type 定義所需的 buffer，例如 `VALIDITY`、`OFFSET` 與 `DATA`。

假設 `age` 使用 32-bit integer，values buffer 概念上可以連續排列成 `22 | 31 | ? | 25`。因為每個 value 都固定 4 bytes，第 4 個元素的 zero-based index 是 `3`，位置可直接用 base address 加上 `3 × 4 bytes` 算出，不需要從前面逐個解析。這也是 Arrow 規格所強調的 O(1) random access 特性之一。

Null 則不是靠在 Value 中放一個特殊 Magic Number 表示，而是透過獨立的 Validity Bitmap。對每一個 Element 使用一個 Bit 表示它是否有效，因此 Nullable Data 不需要把每個 Value 包成額外 Object。這種 Layout 對 Vectorized Processing 特別重要，因為 Values 本身仍然可以保持密集、連續的 Primitive Buffer。

![Arrow Int32 logical array 透過 validity bitmap 與 contiguous values buffer 表示，並以 base 加上 index 乘以 4 bytes 進行固定寬度隨機存取。](/posts/ai-infrastructure-day-06/arrow-int32-memory-layout.png)

> 圖一：Arrow primitive array 不是一組獨立 Python objects，而是由連續 values buffer 與 validity bitmap 等標準化 buffer 組成。

## String 沒有固定長度，那怎麼 Columnar？

Integer 很簡單，因為每個元素都固定 4 Bytes 或 8 Bytes。但 String 就麻煩了。`"AI"` 只有兩個 Characters，`"Infrastructure"` 卻長很多，不可能用固定位置直接算出第 N 個 String 在哪裡。

Arrow 處理 variable-length binary 與 string 時，會使用 validity bitmap、offsets buffer 與 data buffer。要取得某一個 string，可以先從 offsets buffer 找到它的 start 與 end，再從 data buffer 取得對應 byte range。Arrow 的規格與 security 文件都描述了這種「先讀 offset，再定位 data buffer range」的存取方式。

例如：

```text
["Ray", "Arrow", null, "GPU"]
```

Values Buffer 可以把真正字元緊密存成：

```text
RayArrowGPU
```

Offsets 則概念上記錄：

```text
0, 3, 8, 8, 11
```

第一個 string 是 `[0,3)`，第二個是 `[3,8)`，null 的 offset 可以維持不變，而最後一個是 `[8,11)`。這個範例讓 null 的起訖 offset 相同；規格也允許 null slot 對應未定義的非空範圍，是否為 null 仍只由 validity bitmap 決定。

這種 Layout 很重要，因為 String 不需要變成大量獨立的 Heap Object 和 Pointer。大量 Text Data 可以集中存放在幾個 Buffer 裡，而 Column 本身只需要管理 Offset。對 Analytical Processing 而言，這通常比遍歷大量散落的 Object 更適合 Batch / Vectorized Execution。

![Arrow string array 以 validity bitmap、offsets buffer 與單一連續 data buffer 表示 Ray、Arrow、null、GPU。](/posts/ai-infrastructure-day-06/arrow-string-memory-layout.png)

> 圖二：Variable-length string 可以透過 offsets buffer 指向連續 data buffer 中的 byte range，因此不需要為每個 string 建立獨立 object。



## Columnar Layout 為什麼適合現代 CPU？

Arrow 之所以不是單純「大家約好一套格式」，還因為它的 Layout 本身是為 Analytical Processing 設計的。Arrow 官方 Format Specification 把 Sequential Scan 的 Data Adjacency，以及 SIMD / Vectorization Friendly 列為核心特性。

假設我們要對一千萬筆 `age` 做：

```python
age > 30
```

如果資料是一千萬個 Python Integer Objects，CPU 可能需要追蹤大量 Object Pointer，檢查 Object Header，再取得真正 Integer Value。這種 Pointer Chasing 不只是額外指令，也會讓 Memory Access Pattern 比較散亂，CPU Cache 很難充分利用。

如果資料是一塊連續的 Int32 Buffer，Processor 就可以連續讀取一整段 Values。Compiler 或 Compute Kernel 還有機會使用 SIMD，一次對多個 Integer 做相同比較。這也是 Columnar Execution Engine 喜歡「同一型別的 Values 放在一起」的重要原因：不只少讀無關 Column，也讓單一 Operator 更容易批次處理大量相同型別資料。

這個概念和上一篇 Parquet 的 Columnar Storage 有相似之處，但現在發生的位置是 Memory Hierarchy。Parquet 的 Columnar Layout 主要是在降低 Storage I/O、提升 Compression；Arrow 的 Columnar Layout 則進一步利用 CPU Cache Locality 與 Vectorized Execution。兩者都叫 Columnar，但優化的 Resource 並不完全相同。



## Zero-Copy 到底是什麼？

現在終於可以談今天標題裡最容易被誤解的詞：**Zero-Copy**。

最簡單的理解是，Consumer 不需要建立第二份資料內容，而是直接引用既有的 Memory Buffer。假設 Producer 已經有一個 Arrow Int32 Buffer，而另一個 Runtime 也理解 Arrow Layout，那 Consumer 理論上只需要知道 Buffer Address、Length、Data Type 等 Metadata，就可以直接讀同一塊 Memory，而不是把其中的一千萬個 Integer 複製到新的 Array。

傳統方式可能是 `Producer Buffer → Copy → Consumer Buffer`；Zero-copy 的理想情況則是 Producer 和 Consumer 各自建立一個 View，但背後指向同一塊 Data Buffer。Data 本身沒有重新複製，所以交換成本可以大幅下降。

Arrow Format 的一個重要特性，就是它不依賴儲存在 Buffer 內部的 Raw Process Pointer，而是以 Offset 等方式描述資料，因此資料可以在 Shared Memory 等情境中被重新定位，而不需要把所有內部 Pointer 重寫。官方規格直接將這項能力描述為支援 Shared Memory 中真正的 Zero-copy Access。

這也是為什麼「共同 memory layout」是 zero-copy 的前提。如果 producer 使用 A format，而 consumer 只理解完全不同的 B format，即使標榜 zero-copy，最後仍需要進行 representation conversion。Arrow 提供的是雙方共同理解的 memory contract。

![左側 copy-based exchange 依序序列化、複製與反序列化並同時保存多份 buffer；右側則讓兩個 runtime view 指向同一組 Arrow buffers。](/posts/ai-infrastructure-day-06/copy-vs-shared-arrow-view.png)

> 圖三：當 producer 與 consumer 都理解相同 Arrow memory layout 時，consumer 在適用情境下可以直接建立對既有 buffer 的 view，而不必複製完整 data payload。



## Zero-Copy 限制

**Zero-Copy 是有條件的。** 兩端的 Data Type、Null Representation、Memory Ownership 與下游 API 都必須相容，才能直接共享 Buffer。[Arrow 官方 Pandas Integration 文件](https://arrow.apache.org/docs/python/pandas.html)也指出，Pandas 的 Internal Representation 並不總是與 Arrow 相同，因此 Zero-copy Conversion 只在特定條件下成立。

例如，沒有 null 的 Arrow integer array 在格式相容時，可以建立 NumPy view。含有 null 的 column、string、nested type，或 consumer 需要不同 layout 時，仍可能需要 allocation 與 copy。

CPU runtime 能共享 buffer，也不代表資料已在 GPU HBM。Host-to-device transfer 通常仍然存在；需要產生新 column、隔離不同生命週期或改寫資料時，copy 也是合理成本。

Memory Mapping 是另一個常見例子。Arrow IPC File 可以映射進 Process Address Space，讓 Reader 直接引用既有 Memory；它避免的是 Application Layer 額外重建一份 User-space Buffer，不是讓資料從 Disk 到 RAM 完全不移動。同樣地，Array Slice 在適用情況下只需建立不同的 `offset` 與 `length` View，而不必複製 Values；Arrow Array 偏向 Immutable，正是這種共享能安全成立的前提。

更準確的說法是：**Arrow 讓許多原本必須 Serialization + Copy 的資料交換 Boundary，有機會變成共享既有 Buffer。**



## 跨語言資料交換，才是 Arrow 很大的價值

想像一個實際系統。底層 Storage Engine 可能是 C++，上層 Feature Engineering 用 Python，另一個 Analytics Engine 使用 Java，最後某個服務又是 Rust。如果沒有共同 Memory Representation，每兩種語言之間都可能需要設計自己的 Conversion。

如果有 N 種不同 Runtime，而且每一對都要理解彼此的 Internal Representation，整個 Integration Complexity 會很快上升。更實際的做法，是大家共同支援一套 Interchange Format。

Arrow 就扮演這個角色。官方目前提供 C++、C、C#、Go、Java、JavaScript、Julia、Python、R、Ruby、Rust、Swift 等多語言實作與介面。C Data Interface 則更進一步定義如何交換 Arrow array／schema 的描述，讓 library 不必互相 link 到同一個 Arrow runtime，也能共享相同 data layout。

所以從架構的角度，Arrow 可以看成 data system 之間的一種 **memory ABI**（Application Binary Interface）。這個比喻特別接近 C Data Interface 的 ABI 層，不代表所有 Arrow IPC 傳輸都不需要 serialization；核心思想是，大家不用理解對方整套 runtime，只要對「這些 buffer 分別代表什麼」有共同 contract，就可以交換資料。

![沒有共同 memory format 時，Python、Java、C++、Rust 需要大量兩兩轉換；使用 Arrow 時，各 runtime 只連到共同的 columnar memory format。C Data Interface 與 IPC file／stream 的適用邊界不同。](/posts/ai-infrastructure-day-06/arrow-interchange-layer.svg)

> 圖四：C Data Interface 用於同一個 process 中、跨 library 的資料交換；IPC file／stream 用於跨 process、檔案或網路傳遞，並保留 columnar layout。兩者都建立在共同的 Arrow representation 上，但不代表同一種傳輸方式。



## Arrow 放在資料系統的哪一層？

Arrow 最核心的是 in-memory columnar format，不是 database，也不是 Spark、Ray Data 或 DuckDB 這類 execution engine。可以把分工簡化成：Parquet 處理 storage representation，Arrow 處理 in-memory representation，execution engine 則決定資料如何被排程與處理。

資料要跨 process、檔案或 machine 傳遞時，可以使用 Arrow IPC（inter-process communication）format 傳送 schema、record batch metadata 與 buffers。它不會讓 network 傳輸消失，也不保證端到端 zero-copy；價值在於保留 columnar representation，避免兩端先轉成大量 row objects 再重建。

這也解釋了 Arrow 為什麼常出現在 Ray Data。Parquet reader 通常會把表格資料讀成 Arrow-backed blocks（常見為 `pyarrow.Table`），再作為 Ray object store 中的 objects 交給後續 task transform。同一個 node 上的 consumer 可以受益於 shared-memory object store；若 task 被排到另一個 node，block 仍需經過 network 傳輸並建立本機副本。Arrow 降低的是表示轉換與不必要的 copy，不會消除跨 node 的資料移動。

真正要避免的不是所有 Copy，而是**只因為跨過 Software Boundary 就重建一份相同資料**。當資料量來到數十 TB，或 Cluster 每秒流動數百 GB 時，Memory Layout 就不再只是 Implementation Detail，而會直接影響整個 Architecture。



## 從儲存層到記憶體，我們已經少做了很多事情

把上一篇和今天放在一起看，就能看到一條更完整的資料路徑。

Parquet 的 columnar storage 讓 reader 不必讀不需要的 column。Row group statistics 可以略過部分資料區域；encoding 與 compression 再減少 storage 與 network bytes。

資料進入記憶體後，Arrow 透過標準化的 columnar buffer 支援 cache-friendly、vectorized access。相容的 runtime 也能共享 buffer，避免反覆 serialize、deserialize 與 copy。Arrow 官方規格正是以 sequential access、constant-time random access、SIMD-friendly layout 與 shared-memory zero-copy 作為核心設計特性。

所以整條路開始變成：`Storage → 少讀一點 → Memory → 少 Copy 一點 → Compute`

這聽起來不像模型，也沒有任何 Transformer、Attention 或 GPU Kernel，但它直接決定後面的 GPU 能不能持續拿到資料。

而下一個問題也很自然。假設資料已經可以有效率地從 Storage 讀進 Arrow RecordBatch，我們是不是仍然要等「整份 Dataset 全部處理完」之後，下一個 Stage 才能開始？

還是資料可以一批一批往下流，讓不同 Stage 同時執行？

更麻煩的是，這種「一邊產生、一邊往下游執行」常常也被叫做 Streaming，但 Kafka、Flink 那種 Stream Processing 又叫 Streaming。兩者到底是不是同一件事情？

下一篇我們就來釐清這個非常容易混淆的詞：**Batch Processing、Stream Processing、Streaming Execution 差在哪？**

## References

- [Apache Arrow Columnar Format](https://arrow.apache.org/docs/format/Columnar.html)
- [Apache Arrow C Data Interface](https://arrow.apache.org/docs/format/CDataInterface.html)
- [Apache Arrow IPC](https://arrow.apache.org/docs/format/Columnar.html#serialization-and-interprocess-communication-ipc)
- [Apache Arrow: Pandas Integration](https://arrow.apache.org/docs/python/pandas.html)
- [Ray Data Internals](https://docs.ray.io/en/latest/data/data-internals.html)
