---
title: "模型之外：Backpressure：資料跑太快為什麼也會出問題？"
published: 2026-08-25
image: "/posts/ai-infrastructure-day-09/queue-growth.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

上一篇談資料應該離 Compute 多近。不過，就算資料放在正確的 Node，Pipeline 還是可能被另一件事拖垮：上游做得比下游吃得快。

想像一條最簡單的資料路徑：**Storage Reader → CPU Preprocess → GPU Inference**。Reader 每秒讀出 100 批資料，CPU 每秒只能完成 60 批。兩者中間的 Queue 每秒就多 40 批。

如果一批是 100 MB，等於每秒多出約 4 GB。十秒後，Queue 裡多了 40 GB 還沒處理的資料。GPU 即使還沒出問題，Memory 也可能先撐不住。

下游處理不及時，系統必須讓上游減速，而不是持續把資料塞進 Buffer。這就是 **Backpressure** 要解的問題。

## Queue 為什麼會一直長大？

把資料送進 Queue 的一方叫 Producer；從 Queue 取資料處理的一方叫 Consumer。同一個 Stage 常同時扮演兩種角色：Preprocess 對上游 Reader 是 Consumer，對下游 GPU 則是 Producer。

![Producer 長期快於 Consumer 時，Queue 與 Memory 持續累積](/posts/ai-infrastructure-day-09/queue-growth.png)

> 圖一：多產生的資料不會提高整體 Throughput，只會持續累積在 Queue 與 Memory 中。

Queue 很適合吸收短暫的 Burst。Consumer 暫時變慢，或 Producer 短時間衝高時，資料可以先留在 Buffer，等速率恢復後再清掉。

但如果速度差長期存在，加大 Queue 只是延後它被填滿。

Queue 變長也會拉高延遲。再看一個 GPU 前的 Queue：假設 GPU 每秒只能處理 20 批，而前面已經排了 200 批，新進來的資料大約得等十秒才會開始執行。對線上服務而言，Request 雖然沒有被拒絕，延遲卻可能已高到無法接受。

Memory 快滿時，有些系統會把部分尚未處理的暫存資料 Spill 到 Disk。這可以延後 OOM，卻沒有消除速度差，反而加上 Disk I/O；Memory Pressure 與 Spilling 會在 Day 15 再談。

## Backpressure 在限制什麼？

Backpressure 不是永久停掉上游；它限制上游最多能累積多少下游尚未處理的資料，也就是限制 **in-flight data**。Buffer 滿時，上游可能暫停，直到下游釋出容量。

最常見的做法是 Bounded Buffer。Queue 還有空位時，Producer 可以繼續寫；Queue 滿後，系統必須阻塞 Producer，或選擇拒絕、丟棄、Spill 等策略，不能再無限制寫入。另一種做法是讓 Consumer 主動回報可用額度：它還有 4 個 Buffer Slot，就給 Producer 4 個 Credit；Credit 用完後，Producer 得等 Consumer 處理完資料、歸還額度。

Pull-based 設計則把同一件事反過來做。Consumer 準備好時才向上游要下一批資料，因此上游不容易無限制領先。Python Generator 很接近這個直覺：呼叫端沒要下一個值，Generator 就不會往前產生。不過，分散式 Pipeline 仍要限制 prefetch，Pull 本身不保證整條 Pipeline 的記憶體有界。

這些機制的協定不同，核心卻相同：接收端不該被迫無限緩衝資料。[Reactive Streams](https://www.reactive-streams.org/) 是處理非同步、非阻塞 Backpressure 的一套標準，目標正是避免接收端被迫 Buffer 任意多的資料。

## Streaming Execution 為什麼需要它？

Day 07 的 Streaming Execution 讓不同 Stage 重疊工作。CPU 準備下一批資料時，GPU 可以處理上一批；這能減少彼此等待，也讓 Pipeline 不必把整份 Dataset 放進 Memory。

不過，上游可以提前處理多少資料，必須有上限。

GPU 前的 Buffer 快滿時，CPU 應該少啟動一些 Preprocess 工作；CPU 的 Input Queue 也開始累積時，Reader 就得放慢。資料往下游走，壓力卻往上游傳。

所以 Streaming Execution 和 Backpressure 是一組。前者讓 Stage 可以並行，後者不讓上游無限制跑在下游前面。Ray Data 的 streaming executor 也遵循同樣邏輯：operator 有輸入、資源可用，而且尚未受到 backpressure 限制時，才會繼續排入新工作。

## 找到最先開始累積的 Queue

Backpressure 很容易讓人找錯 Bottleneck。假設 GPU 最慢，GPU 前的 Queue 會先變長；Queue 滿了，Transform 沒地方放 Output，只好等；壓力再一路傳到 Clean 和 Read。

最後 Dashboard 上可能同時看到 Read、Clean、Transform 都在等待。這不代表它們都慢，反而可能表示 Backpressure 正在生效：它們停止產生更多無處可去的資料。

![GPU 成為 root bottleneck 後，Backpressure 逐步傳到 Read](/posts/ai-infrastructure-day-09/bottleneck-propagation.png)

> 圖二：被迫等待的 Stage 不一定是 Bottleneck；要找的是 Queue 最初在哪裡開始累積。

Debug 時先看三件事：

1. 哪一個 Queue 最早持續成長？
2. 它下游的 Stage 是忙碌、等待輸入，還是在等待其他資源？
3. Queue 裡累積的是幾筆工作，還是幾 GB 的資料？

如果 GPU 前的 Queue 持續增加，而且 GPU 長時間忙碌，GPU 很可能才是 Bottleneck。CPU 可能因為下游塞住而逐漸 idle。此時把 CPU Parallelism 從 60 batches/s 拉到 100 batches/s，不會提高端到端 Throughput，只會增加 in-flight data。

APache Flink 的[監控模型](https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/monitoring/back_pressure/)正好能協助這樣判讀：資料往下游走，Backpressure 則往上游傳。每個 subtask 都可觀察 backpressured、idle 與 busy 的時間，三者加總約為一秒。不過，仍要搭配 Queue 與 Resource 指標，才能判斷真正的根因。

![從 Queue、Memory 與 Stage 狀態找出 Backpressure 的來源](/posts/ai-infrastructure-day-09/backpressure-monitoring.png)

> 圖三：結合 Queue、Memory、Producer／Consumer Rate 與 Resource Utilization，判讀 Bottleneck 的位置。

若只有某個 Partition 的 Queue 異常地長，問題也可能是 Data Skew，而非整個 Stage Capacity 不足。這會在 Day 21 談 Shuffle 時再展開。

## 線上服務怎麼保護延遲？

放到 LLM Serving 的情境，Queue 裡的東西從資料 Batch 變成 Request。Arrival Rate 長期高於 Service Rate 時，系統不是 Queue 持續成長，就是開始拒絕、逾時或限流。排隊時間會直接反映在 TTFT；GPU Memory 壓力則主要取決於已被接納、正在執行的 Request 與其 KV Cache。

Backpressure 是系統根據下游 Capacity 做出的內部 Flow Control。Rate Limit 則通常是入口 Policy，例如限制單一 Client 每秒能送多少 Request。Production 系統往往兩者都需要：入口限制避免單一 Client 佔滿資源，內部則用 Queue Cap、Admission Control 或 Backpressure 保住整體延遲。

如果超載長期不退，才需要回到 Bottleneck 本身：增加 Consumer Capacity、調整 Batch，或改善 Storage、Network 與模型執行效率。Autoscaling 可以增加未來的 Capacity，但無法立刻消化現在已塞滿 Queue 的工作。

## 小結

因此看完整篇文，真正需要處理的是持續不退的 Backpressure。那表示某個 Stage 的 Capacity 不足，或資料分布、Batch 大小、資源配置出了問題。不只是盲目增加 Parallelism（Not in System Design Interview），而是先找出誰在等誰，以及 Queue 最早從哪裡開始長大。

從 Day 05 到 Day 09，我們一路看了資料格式、Memory Layout、Streaming Execution、Data Locality 與 Backpressure。接下來要進入 Distributed Runtime：**Thread、Process、Task、Actor 到底差在哪？**

## References

- [Reactive Streams](https://www.reactive-streams.org/)
- [Apache Flink — Monitoring Back Pressure](https://nightlies.apache.org/flink/flink-docs-stable/docs/ops/monitoring/back_pressure/)
- [Ray Data Internals](https://docs.ray.io/en/latest/data/data-internals.html)
