---
title: "模型之外：Batch Processing、Stream Processing、Streaming Execution 差在哪？"
published: 2026-08-23
image: "/posts/ai-infrastructure-day-07/bounded-vs-unbounded-data.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

前兩天談的是資料怎麼從 Storage 進到 Memory：Parquet 減少不必要的 I/O，Arrow 減少格式轉換與 Copy。接下來的問題是，資料進入 Pipeline 後，要怎麼往下游走？

假設有一份 10 TB Dataset，要經過 `Read → Decode → Filter → Transform → Model Inference → Write`。我們可以等每一個 Stage 全部完成，再啟動下一個；也可以讓上游先送出第一批資料，下游立刻接手。後者常被稱為 Streaming，但這個詞在不同系統裡意思不太一樣。

Kafka、Flink 與 Spark 談的 Streaming，常指資料會持續到達；Ray Data 談的 Streaming Execution，則是在說 Operator 能不能重疊執行。兩者很像，卻不是同一件事。

今天這篇會談以下三個問題：
1. 資料有沒有終點
2. 系統是否持續處理新資料
3. Pipeline 是否需要逐 Stage 等待

## 先看資料有沒有終點

假設今天有個系統，每天凌晨會產生交易檔案，例如：

```text
transactions-2026-08-16.parquet
```

有固定範圍。即使它有一億筆資料、要跑好幾個小時，系統仍知道什麼時候會處理完。這是 **Bounded Data**，也是 Batch Processing 最常見的輸入。

相反地，網站 Click、IoT Sensor Event 與 Kafka Topic 都可能持續有新資料。系統無法等全部資料到齊才開始，因為那個時刻可能永遠不會來。這是 **Unbounded Data**；處理它時，通常需要持續更新結果與狀態，這就是 Stream Processing 常在處理的工作。

![Bounded 與 Unbounded Data 的差異](/posts/ai-infrastructure-day-07/bounded-vs-unbounded-data.png)

> 圖一：Bounded Data 有明確的結束範圍；Unbounded Data 則可能持續產生新事件。這是 Batch 與 Stream Processing 的第一個差別。

例如「計算昨天所有訂單的平均金額」，可以等整份資料掃完再得到答案；但若是「持續顯示每五分鐘每個地區的交易數」，系統就得面對資料不斷到達、時間窗口與狀態更新。後者的重點不是資料量大，而是輸入沒有固定終點。

**Batch Processing 通常處理 Bounded Data；Stream Processing 通常處理 Unbounded Data。** 這是實務上的常見對應，不是每個框架都用同一套命名。

## Streaming Execution

我們可以舉一個 Ray Data 的 Batch Inference Pipeline 例子：

```python
ds = ray.data.read_parquet("s3://dataset")
ds = ds.map_batches(preprocess)
ds = ds.map_batches(model_inference, num_gpus=1)
ds.write_parquet("s3://output")
```

輸入是一批固定的 Parquet Files，最後一定會處理完，所以這是 Bounded 的 Batch Inference。可是 Ray Data 仍可以用 **Streaming Execution** 跑它。

若採取逐 Stage 的方式，得先完整讀完 Dataset，再開始 Preprocess；等 Preprocess 全部結束，GPU 才能開始 Inference。

而 Streaming Execution 則會先讓 Read 產生幾個 Blocks，Preprocess 立刻去消化它們；Preprocess 一有輸出，GPU 就能開始工作。

```text
Read Block 3       → Storage / Network
Preprocess Block 2 → CPU
Infer Block 1      → GPU
```

透過這方式，能夠讓有限資料也能以 Pipeline 的方式前進，也就是下游 Operator 不必等待上游 Operator 完整結束，便可開始處理輸出 Blocks。

![Boundedness 與 Execution style 是兩個不同維度](/posts/ai-infrastructure-day-07/boundedness-execution-matrix.png)

> 圖二：資料是否 Bounded，和 Operator 是否採用 Streaming／Pipelined Execution，是兩個不同的問題；有限 Dataset 一樣可以使用 Streaming Execution。

| 概念 | 在回答什麼問題？ | 常見例子 |
| --- | --- | --- |
| Batch Processing | 資料是否是一份有限工作？ | ETL、Training Dataset、Batch Inference |
| Stream Processing | 是否需要持續處理沒有終點的新資料？ | Kafka Event、Transaction、Sensor Data |
| Streaming Execution | 下游要不要等上游完整完成？ | Ray Data 的 Pipelined Operators |

所以這兩句都合理：

> 「我們用 Ray Data 跑 Batch Inference，但它採用 Streaming Execution。」

> 「我們處理 Kafka Stream，而引擎把事件分批執行。」

前一句的 Batch 與 Streaming 在描述不同維度；第二句則帶出另一個常見詞：Micro-batch。

## Micro-batch

Micro-batch 不是傳統 Batch Processing 的同義詞。它是一種執行方式，把持續到達的資料切成一小批一小批，再依序處理。

```text
Micro-batch 1: e1 e2 e3
Micro-batch 2: e4 e5
Micro-batch 3: e6 e7 e8
```

以 [Spark Structured Streaming](https://spark.apache.org/docs/latest/streaming/index.html) 為例，輸入仍是 Unbounded Stream；預設的執行引擎則以一系列小型 Batch 處理新到達的資料。邏輯上它仍是 Stream Processing，不會因為底層有 Batch 就變成每日 ETL Job。

同樣地，Streaming Execution 也不等於每來一筆 Row 就建立一個 Task。分散式系統通常會以 Block 或 Batch 為單位交換資料，避免 Scheduling、RPC 與 Serialization 的固定成本壓過真正的 Compute。

## 為什麼 AI Data Pipeline 特別需要它？

想像一個離線圖片推論工作：前半段由 CPU 下載、Decode、Resize，後半段交給 GPU 做 Model Inference。

如果 CPU 必須先處理完所有圖片，GPU 在前半段就只能等；如果每個階段都要等前一階段完整產出，還得先找地方放大量 Intermediate Data。Streaming Execution 讓第一批 CPU Block 一準備好就送往 GPU。穩定後，Reader、CPU 與 GPU 可以同時處理不同 Blocks。

![Batch Inference 中的 bulk synchronous 與 streaming execution 對照](/posts/ai-infrastructure-day-07/batch-inference-streaming-timeline.png)

> 圖三：對 Bounded 的 Batch Inference Workload 而言，Streaming Execution 可以讓 I/O、CPU 與 GPU 同時處理不同 Blocks，不必等待完整 Dataset 通過上一個 Stage。

它不一定讓單一 Operator 變快。它主要減少不同 Resource 彼此等待的時間，讓昂貴的 GPU 能更早開始、也更少閒著。

不過，能不能 Pipeline、Block 該多大、資料是否要先 Materialize，以及遇到 Shuffle 時會發生什麼事，都是 Execution Engine 更深一層的問題。這些會在後面的 Streaming Execution、Object Store 與 Shuffle 文章裡拆開來談。

不知為何寫到這篇時，就會一直想到 Apache Airflow 呢，希望未來 Airflow 的資料儲存體驗能更好 XD。

## 總結

* **Batch Processing**：處理有明確終點的一份資料。
* **Stream Processing**：持續處理沒有固定終點的新資料。
* **Streaming Execution**：讓上游逐步產生輸出時，下游就能開始執行。

當 Pipeline 開始重疊執行後，新的問題很快就會出現：某個 Block 已經在 Cluster 裡一台 Machine 的 Memory 中，下一個 Task 卻被排到另一台。這時資料得跨 Network 搬過去。

下一篇要談的就是：**Data Locality：為什麼搬資料這麼昂貴？**

## References

* [Ray Data Internals — Streaming Execution](https://docs.ray.io/en/latest/data/data-internals.html)
* [Spark Structured Streaming Programming Guide](https://spark.apache.org/docs/4.2.0/streaming/index.html)
* [Apache Flink — Execution Mode (Batch/Streaming)](https://nightlies.apache.org/flink/flink-docs-release-2.0-preview1/docs/dev/datastream/execution_mode/)
