---
title: "模型之外：一個 AI Request 背後到底發生了什麼？"
published: 2026-08-18
image: "/posts/ai-infrastructure-day-02/ai-request-lifecycle.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

昨天我們先建立了整個 AI Infra 的地圖。從 Data Plane、Distributed Runtime、Execution Engine，一路看到 GPU、Inference Engine 與 Serving Layer。不過那張地圖仍然是從「系統有哪些 Layer」的角度理解 AI Infra。今天換一個方向：**不要從架構開始，而是跟著一個 Request 走一次。**

假設我們打開一個聊天介面，輸入「幫我解釋 Kubernetes 是什麼」，然後按下 Enter。從使用者的角度來看，接下來似乎只是 Model 收到 Prompt、開始運算，最後一個 Token、一個 Token 回傳。但在線上的 Production AI Service 裡，真正的路徑通常長得更像：Client 先建立 HTTP Request，經過 API Gateway 與 Authentication，再進入 Model Routing、Admission Control 與 Request Queue，接著由 Serving Layer 選擇適合的 Model Replica，最後才進入 Inference Engine，由 Scheduler 安排 Prefill 與 Decode，真正把 Tensor Operations 送到 GPU 執行。模型產生 Token 後，Response 還會沿著另一條路持續 Streaming 回 Client。

所以一個 AI Request 的生命週期，不是簡單的：Prompt → GPU → Response，而比較接近下圖：

這條路徑裡的每一個步驟，都可能影響最後使用者感受到的 Latency。

![一個 AI request 由 Client 經過 API Gateway、驗證、模型與副本路由、Admission Control、Inference Engine 和 GPU，再串流回應；Metrics、Logs 與 Traces 橫跨整個流程。](/posts/ai-infrastructure-day-02/ai-request-lifecycle.png)

> 圖一：GPU 只是 request path 的一段；在抵達 GPU 前，request 已經經過 Gateway、Routing、Admission Control、Queue 與 Replica Selection。

## 第一步不是 GPU，而是建立一個 Request

當使用者按下送出鍵時，最先發生的事情其實和 AI 沒什麼關係。Client 會建立一個 HTTP Request，其中可能包含 Conversation Messages、Model Name、Temperature、Max Tokens、Streaming Option，以及 Authentication Token。對一個線上服務而言，這時候它還只是普通的 Network Request，和呼叫其他 REST API 沒有本質上的差別。

Request 首先會穿過 DNS、TCP/TLS Connection、Load Balancer 或 Edge Network，最後抵達服務的 API Gateway。這一段看似和模型完全無關，卻已經會貢獻一部分 End-to-end Latency。如果 Client 距離服務所在 Region 很遠、網路狀況不好，或每次都重新建立 Connection，那麼即使 GPU 完全沒有負載，使用者仍然可能感受到明顯延遲。

這也是分析 AI System Performance 時很容易犯的第一個錯誤：看到 Response 很慢，就直接打開 `nvidia-smi`。實際上，在真正開始 Model Execution 之前，Request 可能已經花了一段時間在 Network、Gateway、Authentication 或 Queue。如果只盯著 GPU，很容易完全看錯問題。

## API Gateway 處理的事情，比「轉發 Request」更多

Request 抵達入口後，通常會先進入 API Gateway。傳統 Gateway 已經會處理 TLS Termination、Authentication、Routing、Rate Limiting 與 Request Logging，而 AI API 又開始出現一些更特殊的需求，例如按照 Token 數量限制流量、根據 Model Name 將 Request 導向不同 Backend，甚至依據 Payload、Model Capability 或 Serving State 做更智慧的 Routing。Kubernetes 社群在 2026 年成立 AI Gateway Working Group 時，就將 token-based rate limiting、fine-grained access control、payload inspection 與 AI-specific routing 列為 AI Gateway 的主要需求。

例如使用者可能送出：

```json
{
  "model": "model-a",
  "messages": [
    {
      "role": "user",
      "content": "Explain Kubernetes."
    }
  ],
  "stream": true
}
```

Gateway 收到之後，第一件事情不一定是立刻把它丟進 GPU，而可能先確認 API Key 是否有效、使用者是否超過 Rate Limit、這個帳號能不能使用指定模型，以及 Request Body 是否符合 API Schema。如果是一個企業平台，甚至還可能需要處理 Tenant、Quota、Audit Log 或 Content Policy。

這些功能看起來不像「AI」，卻是 Production AI Platform 不可缺少的一部分。因為 GPU 是非常昂貴而且有限的資源，如果不在入口先做 Admission Control，任何 Client 都能無限制地把 Request 塞進系統，那麼最終只會把壓力全部推到後端 GPU。

## Model Routing：這個 Request 到底要去哪個模型？

通過入口之後，下一個問題是：**這個 Request 應該送到哪裡？**

最簡單的情況是 Client 已經指定：`model = llama-xxx`。

那麼 Router 只需要找到負責這個模型的 Deployment。但 Production AI Platform 很可能同時服務很多模型，例如 Chat Model、Embedding Model、Vision Model、不同尺寸的 Language Model，甚至同一個 Base Model 的多個 LoRA Adapter。Ray Serve LLM 的架構中，OpenAI-compatible ingress 就負責標準 API endpoint、request routing 與 model multiplexing；它也將 ingress-level model routing 與之後的 replica selection 視為不同層次的 Routing 問題。

這裡值得特別區分兩種 Routing。第一種是 **Model Routing**，回答的是「這個 Request 要送到哪個 Model Deployment？」；第二種則是稍後會遇到的 **Replica Routing**，回答的是「同一個 Model 有很多 Replica，這次到底選哪一個？」兩者表面上都叫 Routing，但處理的決策完全不同。

例如：

```text
                  ┌→ Model A
Request → Router ─┼→ Model B
                  └→ Embedding Model
```

選完 Model 之後，事情仍然沒有結束。假設 Model A 現在有四個 Replica：

```text
Model A
 ├─ Replica 1
 ├─ Replica 2
 ├─ Replica 3
 └─ Replica 4
```

接下來還得再決定真正交給哪一個 Replica。



## 不是所有 Request 都應該立刻進 GPU

假設後端只有四個 GPU Worker，但某一瞬間有 10,000 個 Request 同時湧入。直覺上可能會想：「全部送進去排隊就好了。」但這件事情其實很危險，因為 Request 本身就會占用 Memory、Connection、Queue Slot 與後續 KV Cache Capacity。當系統負載超過可以承受的範圍時，如果沒有控制，通常不會變成「所有人稍微慢一點」，而可能直接進入 Latency 急遽上升甚至 Out-of-memory 的狀態。

因此在真正進入 Inference Engine 之前，系統通常需要某種 **Admission Control**。它的核心問題是：現在這個 Request 能不能安全地被系統接受？如果可以，就進入 Queue；如果不行，可能需要 Reject、Throttle，或要求 Client 稍後重試。

這裡的 Queue 也不是單純「排隊等 GPU」而已。它可能包含不同 Priority、不同 Model、不同 Tenant，甚至不同 Service-level Objective。短 Request 與超長 Prompt 對 GPU 的成本不同；一個需要產生 20 Tokens 的 Request，和一個包含 100,000 Tokens Context 的 Request，也很難單純用「一人排一次」公平處理。

這就是 AI Request 開始和一般 HTTP Request 分岔的地方。因為對傳統 Backend 而言，一個 Request 通常不會直接帶著一個巨大的、會持續占用 GPU Memory 幾十秒的 Execution State；但在 LLM Serving 中，一個 Request 進入 Decode 後，可能會長時間持有自己的 KV Cache，因此 Admission Control 最後其實也會和 GPU Memory Management 連在一起。

![沒有 Admission Control 時，無上限佇列會帶來 latency 與 memory pressure；有 Admission Control 時，系統維持有界佇列並讓部分請求 throttle、reject 或 retry。](/posts/ai-infrastructure-day-02/admission-control-capacity.png)

> 圖二：輸入流量超過 GPU capacity 時，無限制增加 queue 只會增加 latency 與 memory pressure；Serving Layer 需要 Admission Control。



## Replica Routing：同一個模型，要選哪一台？

假設 Request 已經確定要使用 Model A，而 Model A 有四個 Replica。最簡單的 Router 可以直接 Round-robin：

```text
Request 1 → Replica A
Request 2 → Replica B
Request 3 → Replica C
Request 4 → Replica D
```

對傳統 Stateless Web Service 來說，這常常已經很好用。但 LLM Serving 並不完全 Stateless。不同 Replica 可能有不同的 Queue Length、GPU Memory Usage，甚至不同的 Prefix Cache State，因此「每台 Server 平均分 Request」不一定等於「每台 Server 的工作量相同」。

Ray Serve LLM 的 Request Routing 就把 Replica Selection 視為可以客製化的決策，文件中特別提到 prefix-aware 與 session-aware routing；另外也支援依照 workload pattern 設計不同的 Routing Policy。 Kubernetes Gateway API Inference Extension 也正是因為一般 HTTP load balancing 缺乏 inference-specific context，才加入 inference-aware routing 的概念。

例如兩個 Request 都包含非常長而且相同的 System Prompt。如果 Replica A 已經 Cache 住這個 Prefix，而 Replica B 沒有，那麼把下一個 Request 送到 Replica A，可能可以重用既有計算結果。如果只做 Round-robin，就可能錯過這個機會。

因此 Routing 在 AI Infra 中慢慢從：**"Which server is free?"**，變成：**"Which replica is best for this request?"**

這個「best」可能同時考慮 Queue、Cache、GPU Load、Model Placement、Session Affinity 與 Request Size。

## Request 終於進入 Inference Engine

走到這裡，我們才真正來到模型附近，前面如果遇到任何不懂的名詞，歡迎點進超連結、詢問你們家的 LLM 了解定義。

Inference Engine 收到 Request 之後，首先需要將輸入文字 Tokenize，得到一串 Token IDs。這些 Token 接著才會真正成為 Model Input。假設 Prompt 最後被切成 2048 Tokens，Inference Engine 並不是簡單呼叫一次 `model(prompt)` 就結束，而是會管理這個 Request 後續完整的生命週期，包括 Prefill、KV Cache Allocation、Decode、Sampling 與 Request Completion。

可以把 Inference Engine 暫時想成三個主要部分：

```text
Scheduler
    ↓
Model Runner
    ↓
GPU
```

旁邊再加上一個：

```text
KV Cache Manager
```

Scheduler 決定哪些 Request 可以在下一輪執行；KV Cache Manager 決定每個 Request 可以使用哪些 GPU Memory Block；Model Runner 則真正將 Tensor Operations 交給 PyTorch、CUDA 或其他底層 Runtime 執行。vLLM 目前的 Serving Stack 就包含 continuous batching、chunked prefill、prefix caching 等能力，而它的 Optimization Guide 也明確描述 Scheduler 如何在 pending decode 與 prefill workload 之間安排執行。

這裡有一個非常重要的觀念：**GPU 本身不知道 HTTP Request 是什麼。**

GPU 不知道 User A / User B / Premium User 是啥，GPU 最後看到的只是 Tensor、Memory Address 與 Kernel Execution。真正把「使用者 Request」轉換成「可以丟到 GPU 上的一組 Tensor Operations」的，是前面的 Serving System 與 Inference Engine。

## Prefill：先把整段 Prompt 吃進去

一個新的 LLM Request 進入模型時，第一個主要階段通常是 **Prefill**。假設 Prompt 有 2048 Tokens，Model 會一次處理這整段 Input，計算每一層 Transformer 的 Attention 與其他 Operations，同時產生後續 Decode 所需要的 KV Cache。

概念上可以畫成：

![Prompt tokens 經過 Prefill 的 Transformer block 後產生 KV Cache，保存在 GPU memory，並在後續 Decode 使用；第一個輸出 token 接著產生。](/posts/ai-infrastructure-day-02/prefill-kv-cache.png)

> 圖三：Prefill 會平行處理整段 prompt，將每個 token 的 Key／Value 狀態寫入 GPU memory；Decode 階段會重用這些 KV Cache。

Prefill 和之後的 Decode 很不一樣。Prefill 一次有大量 Tokens 可以平行處理，因此比較容易充分使用 GPU 的 Matrix Multiplication 能力；Prompt 越長，Prefill 通常也會越重。使用者在這個階段還看不到任何輸出，因此從 Request 送出到第一個 Token 出現之間的延遲，會直接影響一個很重要的 Serving Metric：**Time to First Token，TTFT。**

不過 TTFT 並不等於 Prefill Time。因為在真正開始 Prefill 前，Request 可能已經經過 Network、Gateway、Queue 與 Scheduler。因此更精確地說，使用者感受到的 TTFT 是前面多個階段累積的結果。OpenTelemetry 的 GenAI attributes 甚至包含 `time_to_first_chunk` 這類從 Client 發出 generation request，到收到第一個 streaming chunk 為止的指標。

![TTFT 時間線從使用者送出請求，依序經過 Network、Gateway、Queue、Replica Routing、Scheduling 與 Prefill，最後才到 First Token。](/posts/ai-infrastructure-day-02/ttft-timeline.png)

> 圖四：TTFT 是從 request 發出到第一個 token 抵達 client 的端到端時間，不等於單純的 GPU compute time。



## Decode：第一個 Token 出來後，工作才剛開始

完成 Prefill 之後，模型只產生了第一個 Token。接下來進入 **Decode**。LLM 是 Autoregressive Model，因此新的 Token 會被加入 Context，再用來產生下一個 Token，這個流程會重複直到遇到 Stop Token、Max Tokens，或其他停止條件。

![Prefill 建立 prompt 的 KV Cache；每個 decode iteration 讀取既有 cache，只為新 token 新增一組 K/V，再產生下一個 token。](/posts/ai-infrastructure-day-02/kv-cache-decode-loop.png)

> 圖五：Decode 不會重算整段 prompt。每一輪只讀取既有 KV Cache、處理新 token、附加新的 K/V，然後產生下一個 token。

但真正的 Production Inference Engine 並不會只讓一個 Request 霸占 GPU。假設現在同時有 A、B、C 三個 Request 都已經進入 Decode，Scheduler 可以在每一個 Iteration 中把它們組成一個 Batch，一起產生下一個 Token。當 B 提前完成後，下一輪就可以把新的 Request D 加進來，而不必等 A 與 C 全部完成。這就是 Continuous Batching 的基本想法，也是 vLLM 等現代 Serving Engine 提供的重要能力之一。

因此 GPU 上看到的工作，不一定是：

![Continuous batching：同一輪 iteration 會同時處理多個 request；部分 request 完成後，下一輪可以立即補入新的 request。](https://www.redhat.com/rhdc/managed-files/Continuous+batching+for+requests.png)

> Continuous batching 不會等整批 request 全部結束才換下一批；完成的 request 可以被新的 request 立即補上。

這件事情非常重要，因為從這裡開始，我們就不能再把「一個 HTTP Request」和「一次 GPU Execution」視為同一件事情。一個 Request 會跨越很多次 Decode Iteration，而一次 GPU Execution 又可能同時包含很多個不同 Request。

## KV Cache 讓 Request 變成 Stateful

Decode 還帶來另一個很特殊的問題。Request A 已經處理過的 Context，不能每產生一個新 Token 就全部重新計算，因此 Inference Engine 會保存 Attention 的 Key / Value，也就是 **KV Cache**。

這代表 Request 進入 GPU 之後，不只是「執行一次然後離開」。它會在 GPU Memory 中留下 State：

```text
Request A → KV Cache A
Request B → KV Cache B
Request C → KV Cache C
```

只要 Request 還沒結束，這些 Memory 通常就需要持續保留。Context 越長、Concurrent Requests 越多，KV Cache 占用就會越大。這也是為什麼 LLM Serving 的 Capacity 不只是「GPU 一秒能算多少 FLOPs」，還必須考慮「GPU Memory 同時能容納多少 Active Sequences」。

因此 Request Scheduler 和 Memory Manager 其實不能完全分開考慮。Scheduler 想塞更多 Request 進 Batch，可以提高 GPU Utilization；但塞得越多，同時也會消耗更多 KV Cache。這就是後面 Day 23、Day 25 與 Day 26 會反覆出現的一個 Trade-off：

> **Throughput、Latency 與 Memory Usage 經常互相拉扯。**



## GPU 真正做了什麼？

走了這麼久，我們終於真正進入 GPU。

在 Model Runner 將 Batch 準備完成後，Tensor Operations 才會交給底層 Framework 與 GPU Runtime。Transformer 中會執行大量 Matrix Multiplication、Attention、Normalization、Activation 等操作，這些最後會轉成 CUDA Kernel 或其他 Accelerator Kernel，在 GPU 上執行。

如果模型只使用單張 GPU，事情相對單純；如果模型透過 Tensor Parallelism、Pipeline Parallelism 或其他 Parallel Strategy 分散在多張 GPU，這次 Forward Pass 還可能伴隨 NCCL Collective Communication。也就是說，一個 Request 即使已經「進 GPU」，真正的 Latency 仍然可能同時取決於 GPU Compute、HBM Bandwidth、GPU-to-GPU Interconnect 與 Network。

不過這些細節今天先不深入，因為 Day 27 與 Day 28 會專門處理模型怎麼切到多張 GPU，以及 AllReduce、AllGather 等 Collective Communication 到底在做什麼。今天只需要先記住：**Request 在上層是一個 API 呼叫，到最底層則會變成一系列 Tensor Operations、Memory Access 與 Kernel Execution。**

![從 HTTP Request、Serving Layer、Inference Engine、Model Runtime 一路向下轉換成 GPU 的 CUDA Kernels、HBM 與 Tensor Cores。](/posts/ai-infrastructure-day-02/request-to-gpu-stack.png)

> 圖六：GPU 不知道什麼是 chat request；Serving Layer 與 Inference Engine 會把高階 API request 一路轉成 Tensor Operations 與 GPU kernel。



## Token 產生了，但還沒有回到使用者

GPU 計算出下一個 Token 後，Inference Engine 還需要完成 Sampling，例如根據 Temperature、Top-p 或其他 Sampling Policy 選擇真正輸出的 Token。接著 Token ID 會被轉回文字，然後傳給 Serving Layer。若 Client 開啟 Streaming，Server 不需要等整段 Response 全部生成完成，而可以將新的 Token 或 Chunk 持續傳回 Client。

所以使用者看到的：

```text
K
Ku
Kub
Kube
Kubernetes
```

並不是前端單純做的「打字動畫」。後端確實正在一輪一輪 Decode，新的輸出產生後再持續 Streaming 回 Client。實際 API 可能不是每一個 Token 都形成一個獨立 Network Packet，也可能進行 Buffering 或 Chunking，但整體概念仍然是：**Generation 與 Response 的回傳可以同步進行。**

這也帶來另一個重要 Latency 指標。TTFT 衡量的是使用者多久看到第一個 Token，而第一個 Token 出現之後，還需要觀察 Token 與 Token 之間的時間，也就是常見的 **Inter-token Latency，ITL**。

一個系統可能 TTFT 很快，但之後每個 Token 都等很久；也可能第一個 Token 等比較久，但後續生成非常流暢。這兩種服務對使用者的體感並不相同。

Day 03 我們會正式把 TTFT、Latency、Throughput、QPS 與 Tokens per Second 這些 Metric 拆開。

## Request 結束之後，資源才真正被釋放

當 Model 產生 Stop Token、達到 `max_tokens`，或 Client 主動中斷 Connection 時，這個 Request 的生命週期才接近結束。Inference Engine 會將它從 Active Sequence 中移除，回收 KV Cache 占用的 GPU Memory，Scheduler 下一輪也不會再安排它。Serving Layer 則完成 Streaming Connection，並記錄 Request Status、Input / Output Token Count、Latency 等資訊。

這個 Cleanup 階段其實很重要。如果 Memory 沒有正確回收，系統就可能慢慢累積 Leak；如果 Client 已經 Disconnect，但後端仍然繼續生成剩餘的 5000 Tokens，就會浪費大量 GPU Compute。因此成熟的 Serving System 還必須處理 Cancellation Propagation，讓上游中止 Request 時，下游 Scheduler 與 Model Worker 也能盡快停止不必要的工作。

從 Resource Management 的角度看，一個 Request 的完整過程其實是：

```text
Arrive
  ↓
Wait
  ↓
Allocate Resources
  ↓
Execute
  ↓
Hold State
  ↓
Stream Output
  ↓
Release Resources
```

這已經非常接近 Operating System 管理 Process 的概念。



## Observability 必須跟著 Request 一路走

最後還有一個容易被忽略的問題：如果 Request 很慢，我們怎麼知道慢在哪？

假設使用者看到第一個 Token 花了三秒。這三秒可能是：

```text
Network        100 ms
Gateway         20 ms
Queue         1800 ms
Prefill        900 ms
Other          180 ms
```

也可能是：

```text
Network        100 ms
Gateway         20 ms
Queue           50 ms
Prefill       2650 ms
Other          180 ms
```

兩種情況的 TTFT 都是三秒，但該採取的改善方式完全不同。前者要增加 Capacity、改善 Scheduling 或 Admission Control；後者則可能需要改善 Long Prompt Processing、Model Execution 或 Parallelism。

因此只記錄一個：

```text
request_latency = 3 sec
```

幾乎不夠。

比較完整的 Observability 需要把 Request 分解成不同 Span，並且同時搭配 Metrics。OpenTelemetry 的 GenAI Semantic Conventions 就是希望替模型名稱、Token Usage、Tool Call 等 Generative AI operation 建立一致的 Telemetry 描述；2026 年 OpenTelemetry 的相關文章也特別強調，除了傳統系統指標之外，GenAI 呼叫本身的 Model、Input / Output Tokens 等資訊也需要被納入追蹤。

![一個 chat completion request 的 trace waterfall，拆成 gateway、model router、queue wait、prefill、decode 與 streaming response 等 span，並標示 TTFT、ITL、token、GPU 與 KV cache 指標。](/posts/ai-infrastructure-day-02/ai-request-trace.png)

> 圖七：End-to-end latency 只是結果；Trace 把 request 拆成 Gateway、Queue、Prefill、Decode 等階段，才有辦法定位瓶頸。



## 把整條 Request Path 再走一次

現在重新回到最開始的那個 Prompt：

> 幫我解釋 Kubernetes 是什麼。

按下 Enter 之後，Client 首先建立 Network Request，Gateway 處理 Authentication、Rate Limit 與基本 Routing；Model Router 找到對應的 Model Deployment，Admission Control 判斷系統是否還有 Capacity，Request 接著進入 Queue。Replica Router 再根據後端負載、Cache 或其他 Policy 選擇具體 Worker，Inference Engine 收到 Request 後執行 Tokenization、KV Cache Allocation 與 Scheduling，接著開始 Prefill。

完成 Prefill 之後，第一個 Token 出現，系統開始 Streaming Response；Request 接著進入一次又一次 Decode Iteration，和其他 Concurrent Requests 動態組成 Batch。每一輪 Model Runner 都會將 Tensor Operations 送進 GPU，同時重用先前留下的 KV Cache。直到模型產生 Stop Token，Inference Engine 才釋放 Request 的 KV Cache，Serving Layer 關閉 Streaming Response，而 Observability System 則留下完整的 Metrics、Logs 與 Trace。

整個過程可以濃縮成：

```text
Request
  ↓
Network
  ↓
Gateway
  ↓
Routing
  ↓
Admission Control
  ↓
Queue
  ↓
Replica Selection
  ↓
Scheduling
  ↓
Prefill
  ↓
First Token
  ↓
Decode × N
  ↓
Streaming
  ↓
Cleanup
```

昨天我們說：

> **AI Infra 是把有限的 Compute、Memory、Network 與 Storage，轉換成可以讓 AI Workload 穩定、高效率、大規模執行的系統。**

今天走完這條 Request Path 之後，就可以看到這句話真正的意思。Network 是有限的，Queue Capacity 是有限的，GPU Compute 是有限的，GPU Memory 也是有限的；而一個 Serving System 的工作，就是讓大量 Request 在這些有限資源之間流動，同時維持合理的 Latency 與 Throughput。

因此，當有人說「這個 AI API 很慢」時，第一個問題不應該是：「GPU 是不是不夠快？」，而應該是：「**Request 到底慢在哪一段？**」

因為從按下 Enter 到 Token 出現在畫面上，中間可能經過十幾個完全不同的系統元件，而 GPU 只是其中之一。

下一篇我們就會正式建立分析這些問題所需要的基本語言： **Latency、Throughput、QPS 到底差在哪？**
