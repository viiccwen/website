---
title: "模型之外：Latency、Throughput、QPS 到底差在哪？"
published: 2026-08-19
description: "建立延遲、吞吐量、QPS 與 tail latency 的共同語言。"
image: "/posts/ai-infrastructure-day-03/latency-breakdown.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

昨天我們跟著一個 AI Request，從 Client 一路經過 Gateway、Routing、Queue、Inference Engine，最後才真正抵達 GPU。這條路徑帶出了一個更實際的問題：當我們說「這個 AI 系統很快」時，**快到底是在說什麼？**

假設有兩套 LLM Serving System。System A 平均 500 ms 就能處理完一個 Request，但一秒最多只能處理 10 個 Request；System B 處理單一 Request 需要 800 ms，卻可以同時服務大量使用者，一秒完成 100 個 Request。哪一個比較快？答案取決於我們在乎的是單一使用者等待多久，還是整套系統單位時間能處理多少工作。這正是 Latency 與 Throughput 的差別。

問題到了 LLM 又更麻煩。傳統 Web API 常用 QPS（Queries Per Second）衡量吞吐量，但兩個 LLM Request 的成本可能差非常多：一個 Request 只有 20 個 Input Tokens 並產生 10 個 Output Tokens，另一個卻可能帶著 20,000 Tokens 的 Context，最後再產生 2,000 Tokens。如果只看「每秒完成幾個 Request」，就把兩個完全不同的工作量當成了一樣的東西。因此在 AI Infrastructure 裡，我們除了 Latency、Throughput 與 QPS，還會看到 TTFT、ITL、TPOT、Tokens/s、Concurrency、Queue Time 與各種 Percentile。

這些 Metric 看起來很多，但它們其實都在回答三個基本問題： **一個 Request 要等多久？系統單位時間可以完成多少工作？同一時間有多少工作正在系統裡？** 理解這三件事情，才有辦法開始真正分析 AI System Performance。

## Latency：一件工作需要多久完成？

Latency 最直覺的定義，就是從一件工作開始到完成所經過的時間。假設一個 Request 在 `12:00:00.000` 送出，`12:00:00.800` 收到完整 Response，那麼這個 Request 的 End-to-end Latency 就是 800 ms。

不過昨天已經看到，一個 Request 的 800 ms 並不代表 GPU 算了 800 ms。它可能包含 Network、Gateway、Queue、Scheduling、Model Execution 與 Response Transfer 等多個階段。像是 NVIDIA Triton Inference Server 就會把 Request 的時間拆成 Queue Time、Compute Input Time、Compute Infer Time 與 Compute Output Time 等不同部分，而不是只記錄一個總數字。

因此可以把 End-to-end Latency 粗略想成： **End-to-end Latency = Network + Gateway + Queue + Scheduling + Model Execution + Response Transfer**

這個式子不是某個 Framework 的正式計算公式，而是一個分析方式。 **Latency 是一條 Critical Path 上所有時間累積的結果。** 如果 Request 在 Queue 裡等了兩秒，那麼即使 GPU 只需要 200 ms，使用者感受到的 Latency 仍然會超過兩秒。

這也是為什麼 Performance Optimization 最重要的第一步通常不是讓某個 Kernel 再快 10%，而是先知道時間究竟花在哪裡。如果 90% 的 Latency 都來自 Queue，那麼把 Model Execution 從 200 ms 優化到 180 ms，對使用者而言幾乎沒有意義。

![一個 request 的端到端 latency，由 Network、Gateway、Queue、Scheduling、Model Execution 與 Response Transfer 組成；Queue 與 Model Execution 只是其中的階段。](/posts/ai-infrastructure-day-03/latency-breakdown.png)

> 圖一：End-to-end latency 是整條 request path 的累積結果，GPU compute 通常只是其中的一部分。

## Average Latency 很好懂，但很容易騙人

假設今天有五個 Request：`100 ms、110 ms、120 ms、130 ms、2540 ms`

平均值是 600 ms。但這個 `600 ms` 其實很難描述任何一個真正使用者的體驗。大部分人只等了一百多毫秒，但其中一個使用者卻等了 2.5 秒。這也是 Production System 很少只看 Average Latency 的原因。

更常見的方法是看 Percentile，例如 P50、P95、P99。P50 可以理解成中位數，也就是大約一半的 Request 比這個值快、一半比它慢；P95 則表示大約 95% 的 Request 都在這個時間內完成，剩下約 5% 更慢；P99 則更加關注 Distribution 的尾端。這些很慢、但比例較少的 Request 通常被稱為 **Tail Latency**。

假設某服務的 Average 是 400 ms、P50 是 250 ms、P95 是 900 ms，P99 則是 2,300 ms。只看 Average，可能覺得 400 ms 很漂亮；但 P99 告訴我們，每一百個 Request 裡大約就有一個可能需要兩秒以上。在一個每天處理上億 Request 的服務裡，「只有 1%」其實已經是一個非常龐大的使用者群。

Tail Latency 特別容易受到 Queue、Resource Contention、Network Jitter、長輸入、Batch Composition 與其他 Workload Variance 影響。因此 Production AI Serving 最終關心的通常不是「Benchmark 跑出最快多少」，而是在某個負載下，**P95 / P99 是否仍然符合 Service Level Objective（SLO）**。

![右偏的 request latency histogram：大多數請求集中在低延遲區域，少數慢請求形成長尾，並標示 P50、P95 與 P99。](/posts/ai-infrastructure-day-03/tail-latency-distribution.png)

> 圖二：平均 latency 可能掩蓋少數非常慢的 request，因此 production system 通常還會觀察 P50、P95 與 P99。

---

## Throughput：系統每秒完成多少工作？

Latency 關心的是一件工作需要多久，Throughput 則換了一個視角：**一段時間內，整套系統完成了多少工作？**

假設一個 Inference Server 在 10 秒內成功完成 500 個 Request，那麼它的 Request Throughput 可以表示為：`500 requests / 10 seconds = 50 requests/s`

但「工作」並不一定只能用 Request 數量衡量。在 Data Processing 裡，Throughput 可能是 MB/s、GB/s 或 Rows/s；在 Network 裡可能是 Bytes/s；到了 LLM Serving，更常看到 Tokens/s。vLLM 的 Benchmark 與 Production Metrics 就會分別報告 Serving Latency 與 Token-related Throughput，而不是只提供單一 Request Latency。

因此 Throughput 其實是一個泛稱：`Throughput = Amount of work completed / Time`

真正重要的是先問： **這裡的 Work 到底用什麼單位？** ，例如：`Requests / second、Tokens / second、Rows / second、GB / second` 全部都可以是 Throughput。

## QPS 其實只是 Throughput 的一種表示方式

QPS 是 Queries Per Second，通常用來表示系統每秒能處理多少 Query。在 API Serving 情境中，也常看到 RPS（Requests Per Second）。如果每個 Query 就對應一個 Request，那麼兩者在很多討論裡幾乎可以用相同方式理解。

例如：`System A = 20 QPS`，代表這套系統平均每秒處理約 20 個 Query。

因此 QPS 只是 Throughput 的一種單位：Throughput 也可以用 Requests/s、Tokens/s、Rows/s 或 Bytes/s 表示。在傳統 Search、Database 或 REST API 中，QPS 很好用，因為不同 Request 的 Workload 往往相對容易比較。但到了 LLM Serving，QPS 很快就會遇到一個問題：Request 的大小差異實在太大。

## LLM 為什麼需要 Tokens/s？

對 LLM 而言，Token 是比 Request 更接近實際計算量的單位之一。

假設一秒內系統完成兩個 Request，Request A 產生 20 個 Output Tokens，Request B 產生 180 個。Request Throughput 是 `2 requests/s`，但 Output Token Throughput 是 `200 tokens/s`。如果下一秒仍然完成兩個 Request，但兩個 Request 都只生成 10 Tokens，那麼 QPS 一樣是 2，Output Token Throughput 卻只剩 `20 tokens/s`。

這就是為什麼 LLM Serving 特別常看到 `tokens/s`。它讓我們更接近真正的 Generation Workload。

不過這裡還要再區分兩個很容易混在一起的概念：**System Throughput** 與 **Per-request Generation Speed**。

假設 GPU 同時處理 100 個 Request，整個 Server 合計每秒產生：`5,000 output tokens/s`，這是 Aggregate Output Token Throughput。

但其中每個使用者的回答可能只有 `50 tokens/s`，這是單一 Request 感受到的 Generation Rate。

兩個數字都叫 Tokens/s，意思卻完全不同。System Throughput 是 Capacity Metric，比較接近 Infra Engineer 在乎的「這張 GPU 一秒總共吐多少 Token」；Per-request Tokens/s 則比較接近使用者體驗，「我的答案每秒出現多少 Token」。vLLM 現在的 Per-request Metrics 也將每個 Request 的 `tokens_per_second` 與 Aggregate Server Metrics 分開提供。

![System A 與 System B 都是 10 QPS，但前者每個 request 產生 20 個 output tokens，後者產生 200 個，因此 output token throughput 相差十倍。](/posts/ai-infrastructure-day-03/qps-token-throughput.png)

> 圖三：相同 QPS 不代表相同 LLM workload。Prompt 與 output length 不同時，每個 request 所需的計算量可能相差數十倍。

## Concurrency：現在有多少 Request 還沒做完？

另一個非常重要、但常和 QPS 混在一起的概念是 **Concurrency**。

Concurrency 描述的是某個時間點有多少工作正在系統中。這些 Request 可能正在 Queue 裡，也可能正在 Prefill、Decode，甚至正在等待其他 Resource。假設現在有 50 個尚未完成的 Request，那麼可以粗略說目前有 50 個 In-flight Requests。

QPS 是 Rate：每秒有多少 Request 被處理；Concurrency 是 Quantity：同一時間有多少 Request 還在系統裡。例如一個服務可能只有：10 QPS，但如果平均每個 Request 需要 10 秒才能完成，那系統裡可能長期同時存在約 100 個 Request。反過來，如果每個 Request 只需要 100 ms，即使同樣是 10 QPS，同時存在的 Request 可能非常少。

## 為什麼提高 Concurrency 可以增加 Throughput？

假設 GPU 一次只服務一個 Request。當它在等待某些 Memory Operation、處理較小的 Tensor，或沒有足夠工作填滿硬體時，GPU Resource 可能沒有被充分利用。如果讓更多 Request 同時存在，Inference Engine 就有更多工作可以組成 Batch，通常能提高硬體利用率，進一步提高 Aggregate Throughput。

因此從低 Concurrency 開始增加負載時，Inference Engine 有更多 Request 可以組成 Batch，GPU Utilization 會提高，Throughput 也會跟著上升。這也是 Continuous Batching 之所以重要的原因。

但這條關係不會無限持續。

當 GPU 已經接近 Saturation，再增加 Request 並不會讓它突然產生更多 Compute Capacity。新進來的 Request 只能等待，Queue Length 隨之增加，Queue Time 和 Latency 也會被拉高。

最後會出現一個很重要的現象：**Throughput 開始趨於平坦，但 Latency 卻快速上升。**

這就是 Capacity Planning 中很重要的 Saturation Point。

![Latency 與 throughput 對 offered load 的概念曲線：throughput 在 saturation point 後趨於平坦，latency 則快速上升。](/posts/ai-infrastructure-day-03/saturation-curve.png)

> 圖四：增加 concurrency 在低負載時可以提高 throughput；GPU 接近飽和後，額外負載主要轉化成 queue time，因此 latency 快速上升。

## 所以「最大 QPS」其實不一定是最有用的數字

Benchmark 很喜歡問：這套系統最高可以跑多少 QPS？但如果為了達到 100 QPS，P99 Latency 已經來到 30 秒，那這個最大 QPS 對很多 Production Service 根本沒有意義。

更合理的問題通常是： **在 P99 Latency < 2 秒的限制下，最高可以維持多少 QPS？** 或對 LLM **在 P95 TTFT < 1 秒、P95 ITL < 50 ms 的條件下，可以維持多少 Output Tokens/s？**

這就是 **SLO-constrained Throughput** 的思考方式。不是追求理論上的 Maximum Throughput，而是在 Latency SLO 還能接受的範圍內找出最大 Capacity。

例如：

| Concurrency | Throughput | P99 Latency |
| --- | --- | --- |
| 8 | 20 req/s | 300 ms |
| 16 | 38 req/s | 350 ms |
| 32 | 70 req/s | 500 ms |
| 64 | 92 req/s | 1,500 ms |
| 128 | 96 req/s | 8,000 ms |

從純 Throughput 來看，128 Concurrency 最高。但系統從 64 增加到 128，只多了約 4 req/s，P99 Latency 卻從 1.5 秒暴增到 8 秒。如果 Production SLO 是 P99 < 2 秒，那麼真正可用的 Capacity 更接近 64 Concurrency 時的 92 req/s，而不是 Benchmark 上漂亮的 96 req/s。

所以真正要找的通常不是「最右邊」，而是那個 **Knee Point**。

## Streaming LLM 的 Latency 不能只看一個數字

對一般非 Streaming API，Request Latency 很容易理解：Request 發出到完整 Response 回來，直接算時間差即可。但 LLM Response 可能生成幾百甚至幾千個 Tokens，如果一定要等完整答案生成才算 Latency，那麼這個數字很難描述使用者實際感受。

例如兩個 Request 都花 10 秒完整生成。System A 要等 9 秒才出現第一個 Token，卻會在接下來 1 秒快速產生剩下內容；System B 在 1 秒後就開始回答，接著用 9 秒持續輸出內容。兩者的 End-to-end Latency 都是 10 秒，但使用者體驗顯然完全不同。

因此 LLM Serving 會把 Latency 再拆開。

第一個重要指標是 **Time to First Token（TTFT）**，也就是 Request 開始後，到第一個 Output Token 產生所需要的時間。昨天看到，TTFT 可能包含 Queue、Scheduling 與 Prefill 等階段，因此它很適合反映「按下 Enter 之後多久開始看到答案」。vLLM 的 Metrics 也會單獨記錄 Time to First Token，而不是只提供整體 Request Latency。

第二個重要指標則是 **Inter-token Latency（ITL）**，也就是連續兩個 Output Token 之間相隔多久。vLLM 的文件將 ITL 定義為 successive output tokens 之間的時間，因此一個 Request 在 Decode 過程中會產生很多個 ITL Sample。

例如一個 Request 在 600 ms 後產生 Token 1，接著以 25 ms、27 ms、24 ms 的間隔產生 Token 2 到 Token 4。它的 TTFT 是 600 ms，ITL 約為 25 ms。這兩個 Metric 分別描述完全不同的使用者體驗：TTFT 決定「多久開始回答」，ITL 則決定「回答出現得流不流暢」。

## ITL、TPOT 與 Tokens/s 又是什麼關係？

除了 ITL，LLM Benchmark 還常看到 **TPOT（Time Per Output Token）**。不同 Framework 或 Benchmark 對統計方式可能存在細節差異，因此閱讀結果時最好確認其正式定義；概念上它們都在描述 Decode 階段產生 Output Token 所需的時間。vLLM 目前同時提供 Inter-token Latency 與 request time-per-output-token 相關 metrics。

如果先忽略 Batching 與統計細節，單一 Request 每個 Token 平均花費 `20 ms/token`，Generation Rate 就會為 `1 / 0.020 = 50 tokens/s`。

但到了整個 Server 層級，這個關係就不能直接使用。假設 GPU 同時服務 100 個 Request，每個 Request 平均只有 50 tokens/s，Server Aggregate Throughput 仍然可能達到數千 tokens/s。這正是 **Per-request Latency** 與 **Aggregate Throughput** 必須分開看的原因。

## TTFT 和 ITL 還可能互相拉扯

更麻煩的是，想讓 TTFT 變快，不一定同時會讓 ITL 變快。

假設現在 GPU 上有很多正在 Decode 的 Request，同時又進來一個很長的新 Prompt。Inference Scheduler 可以優先處理這個新 Request 的 Prefill，讓它更快拿到 First Token，TTFT 因此下降；但 Prefill 會占用 GPU Compute，原本正在 Decode 的 Request 可能就得等待更久，ITL 反而增加。

反過來，如果 Scheduler 永遠優先保護 Decode Request，既有使用者的 Token Stream 可能非常平順，但新進來的 Request 會長時間卡在 Queue，TTFT 就會惡化。

這是一個很典型的 Scheduling Trade-off：改善 TTFT、保護 ITL 與最大化 Throughput，通常無法同時做到最好。

這也是為什麼 vLLM 等 Serving Engine 的 Scheduler 需要同時處理 Decode 與 Prefill Workload，而不是單純維護一個 FIFO Queue。

後面到了 Day 24 的 Prefill vs Decode，以及 Day 29 的 Disaggregated Serving，我們會再次看到這個問題。

![LLM streaming token timeline，從 Request Sent 經過 Queue、Scheduling、Prefill 到 Token 1；TTFT 量測首次回應，ITL 量測後續 token 的間隔，並標示 end-to-end latency。](/posts/ai-infrastructure-day-03/streaming-latency.png)

> 圖五：Streaming LLM 的體驗無法只靠單一 latency 描述；TTFT 反映開始回答的速度，ITL 反映後續 token 產生的流暢程度。

---

## 一個系統到底應該看哪些數字？

現在可以把這些 Metric 放到同一張表裡理解。

| Metric          | 回答的問題                   | 常見單位     |
| --------------- | ----------------------- | -------- |
| Latency         | 一個 Request 要多久？         | ms、s     |
| P50 / P95 / P99 | 大部分與尾端 Request 多慢？      | ms、s     |
| Throughput      | 單位時間完成多少工作？             | work/s   |
| QPS / RPS       | 每秒完成多少 Query / Request？ | req/s    |
| Concurrency     | 同一時間有多少 Request 在系統中？   | requests |
| Queue Time      | Request 等資源等了多久？        | ms、s     |
| TTFT            | 多久看到第一個 Token？          | ms、s     |
| ITL             | 相鄰 Output Token 間隔多久？   | ms/token |
| Tokens/s        | 單位時間產生多少 Token？         | token/s  |

真正分析 Production AI System 時，這些數字通常不能單獨存在。NVIDIA Triton 同時提供 Request Count、Queue Duration、Compute Duration 與 GPU Metrics，就是因為「Request 很慢」可能來自 Queue，也可能真的來自 Compute。 vLLM 的 Production Metrics 則進一步加入 TTFT、Inter-token Latency 與 Time Per Output Token 等 LLM-specific Metrics。

換句話說，只知道「我們的 Throughput 是 3,000 tokens/s」還不能判斷這套系統好不好。還得知道測試時的 Concurrency、Input / Output Length、P95 TTFT、P99 ITL、GPU 數量與 Queue Length，也要分清這是單一 Request，還是整個 Server Aggregate 的 Throughput。少了這些 Context，一個漂亮的 Benchmark 數字可以非常沒有意義。

---

## Latency 和 Throughput 不是敵人，但通常存在 Trade-off

到這裡最重要的一個觀念，是不要把 Performance 想成只有一個維度。

如果今天只有一個 Request，系統可以馬上讓它使用 GPU，Latency 可能非常低，但 GPU 未必被充分利用。增加 Concurrent Requests 後，可以透過 Batching 提高 Utilization，Aggregate Throughput 也可能快速增加；然而當系統逐漸接近飽和，更多 Request 開始進入 Queue，Latency 就會上升。最後 GPU 已經跑滿，再塞更多 Request 幾乎不會增加 Throughput，只會讓大家等得更久。

所以 Production Serving 真正追求的通常不是最低 Latency，也不是最高 Throughput，而是在 Latency SLO 內取得最大的有效 Throughput。

例如，真正有工程意義的 Capacity 問題是，在 P95 TTFT < 1 秒、P99 ITL < 100 ms 的條件下，這組 GPU 最多可以承受多少流量？

而當流量超過這個 Capacity 後，就必須考慮昨天提到的 Admission Control、Autoscaling、Rate Limiting，甚至直接 Reject Request。因為當 GPU 已經 Saturated，再多收一千個 Request 並沒有創造任何新的 Compute，只是把「沒有 Capacity」變成「大家一起排更久」。

## 效能問題真正要問的不是快不快

經過今天這些 Metric，可以回頭看一句很常見的問題：「這個模型 Serving 快嗎？」這句話其實資訊非常不足。要回答它，得同時看單一 Request 的 P50、P95、P99 Latency、第一個 Token 出現的時間、後續 Token 的生成速度、系統可承載的 Concurrency，以及在 Latency SLO 下的最高 Throughput。負載升高時 Queue Time 的變化和 GPU Utilization 也不能漏掉。這些問題合在一起，才構成完整的 Performance Picture。

Latency 描述**等待時間**，Throughput 描述**處理能力**，QPS 是以 Request / Query 為單位的 Throughput，而 Concurrency 描述**現在同時有多少工作存在**。到了 LLM Serving，我們還得進一步把 Latency 拆成 TTFT 與 ITL，並把 Request Throughput 補上 Token Throughput，因為每個 Request 的大小可能完全不同。

**低 Latency 不代表高 Throughput，高 Throughput 也不代表良好的使用者體驗；真正的 Production Performance，是在有限資源與 Latency SLO 下取得可以接受的 Throughput。**

假設 GPU 已經很快，Throughput 卻還是上不去，或者 GPU Utilization 明明只有 30%，Request 卻已經慢得不得了，那瓶頸到底藏在哪...？

下一篇我們就來看： **AI 系統的瓶頸，為什麼常常不是 GPU？**
