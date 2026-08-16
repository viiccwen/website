---
title: "模型之外：AI Infra 到底是什麼？"
published: 2026-08-17
description: "從資料平面、分散式執行環境到控制平面，建立 AI Infra 的全貌。"
image: "/posts/ai-infrastructure-day-01/ai-request-lifecycle.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

## 前言

大家好，我是 [Vic](https://www.linkedin.com/in/viiccwen)，很高興又能繼續參加鐵人賽連載，這次是跟隨著我們團隊：[源來適愛開緣](https://ithelp.ithome.com.tw/2026ironman/signup/team_list?keyword=%E6%BA%90%E4%BE%86%E9%81%A9%E6%84%9B%E9%96%8B%E7%B7%A3) 一同連載，期望這三十天大家都能開開心心學技術，寫技術文章，將我們源來適你的精神傳承下去）x

會想開啟這系列文章是因為，隨著 AI/LLM 的爆發式成長，每個專案已逐漸開始融合大量的 LLM/Agent 元素，甚至有許多新鮮事物要學習，因此開設了此主題，來跟大家一同學習～

這三十天的文章會大量使用 AI 生成簡單的概念圖，因為我超級不會做圖（論文的 Architecture Overview 可以畫兩三天...）。

若你想要快速看到後續文章，或是有更好的觀看體驗，可以直接來我的 [Blog](https://vicwen.com/zh-tw/blog) 看，那我們就開始吧。

> 這篇文章裡會出現很多你可能還不熟悉的名詞，例如 Kubernetes、Ray、vLLM、KV Cache、Data Plane、Scheduler...等等。不用擔心，這些都不需要現在就懂。在接下來的系列中，我會一個一個講清楚。
>
> 第一天的目標不是理解所有細節，而是先建立一個整體輪廓，AI Infra 到底在解決什麼問題、它長什麼樣子、以及為什麼它會變得重要。

---

## 正文開始！

這幾年只要開始接觸大型語言模型、GPU、Kubernetes、Ray 或 vLLM，很快就會碰到一個詞：**AI Infrastructure，簡稱 AI Infra**。但這個詞其實沒有一條非常嚴格的邊界。有些團隊把 GPU Cluster 管理稱為 AI Infra，有些公司則把 Distributed Training、Model Serving、Data Pipeline，甚至整個 ML Platform 都放在 AI Infra 的範圍裡。與其試著替它找一個唯一正確的定義，不如先從它實際想解決的問題開始看。

當我們使用 ChatGPT 之類的 AI 服務時，從使用者的角度來看，整個流程似乎只有三件事：**送出 Prompt、模型執行、取得 Response**。但真正的 Production AI System 遠比這複雜。一個 Request 進入系統後，可能先經過 API Gateway、身分驗證、Rate Limiting 與 Model Routing，接著進入 Queue 等待資源，再由 Scheduler 決定應該交給哪一個 Model Replica 與哪組 GPU。模型執行過程中還需要管理 GPU Memory、KV Cache、Batching 與多 GPU Communication，最後才會以 Streaming 的方式將 Token 傳回 Client。與此同時，Metrics、Logs 與 Traces 還必須持續記錄整條 Request Path，否則當系統變慢時，我們根本不知道問題出在哪裡。

![一個線上 AI request 從 Client 經過 Gateway、驗證、路由、佇列、排程與 GPU，再以串流回應返回；Logs、Metrics 與 Traces 橫跨整條路徑。](/posts/ai-infrastructure-day-01/ai-request-lifecycle.png)

> 圖一：使用者只看到 Prompt 與 Response，但 request 會穿過 Gateway、Routing、Queue、Scheduler、Inference Engine 與 GPU 等多個元件。

因此，AI Infra 並不是單純「管理 GPU」而已。比較完整的理解是：**AI Infra 是負責組織資料、運算資源與執行系統，讓 AI Workload 能夠穩定、高效率並且大規模執行的基礎設施。**這裡的 Workload 也不只有模型訓練，它可能包含資料前處理、Distributed Training、Fine-tuning、Batch Inference、Online Inference、Embedding Generation，甚至近年的 LLM Serving 與 Agent Execution。AI Infra 真正關注的問題通常不是「這個模型準不準」，而是「它要怎麼在有限的 CPU、GPU、Memory、Network 與 Storage 下有效率地跑起來」。

如果把 AI 拿掉，其實 Infrastructure 本身就是一個非常典型的 Systems 問題。假設一台機器上同時執行很多程式，Operating System 必須決定 CPU 怎麼排程、Memory 怎麼配置、Process 怎麼隔離，以及某個程式發生錯誤時該如何處理。當規模從一台機器放大到幾百台甚至幾千台之後，問題就進一步變成 Distributed Systems：Task 應該在哪一台機器執行、資料存在哪裡、不同節點之間如何交換資料、某個 Worker 掛掉後如何恢復，以及如何讓使用者不必直接管理每一台實體機器。

AI Infra 其實並沒有推翻這些問題，而是在原本的 Distributed Systems 上加入新的資源與限制。傳統系統主要管理 CPU、RAM、Disk 與 Network，但 AI Workload 又加入了 GPU、GPU Memory、GPU Interconnect、Model Weights、Activations 與 KV Cache。當模型大小超過單張 GPU 的記憶體容量時，就必須考慮 Tensor Parallelism、Pipeline Parallelism 或 Sharding；當幾百個 Request 同時使用同一個模型時，則需要思考如何安排 Batch、怎麼配置 KV Cache，以及誰應該先取得 GPU 執行時間。換句話說，AI Infra 很多看似全新的技術，其實都是經典 Systems 問題在新的硬體與 Workload 上重新出現。

---

## AI Infra 是一層一層疊出來的

從整體架構來看，一個現代 AI Infra Stack 大致可以分成幾個層次。最底層是硬體資源，包括 CPU、GPU、Network 與 Storage；上面是 Resource Management，負責決定哪些 Workload 可以取得哪些資源；再往上則可能是 Distributed Runtime，提供 Task、Actor、Object 等抽象，讓程式可以跨多台機器執行。除此之外，還有負責搬運與處理資料的 Data Plane，以及真正控制模型推論流程的 Inference Engine。最上層才是使用者真正接觸到的 AI Application，例如 Chat、RAG、Search 或 Agent。這些 Layer 不一定在每家公司都用相同名稱，但它們處理的問題大致相似。

![AI Infra 由 Hardware、Resource Management、Data Plane、Distributed Runtime、Execution Engine、Inference and Serving 與 AI Application 組成；Observability 跨越所有層。](/posts/ai-infrastructure-day-01/ai-infrastructure-stack.png)

> 圖二：AI Infra 由硬體、資源管理、資料與執行系統，以及 serving 等多層組成。

其中最底層的限制永遠來自硬體。無論上層 Framework 提供多少抽象，最終的模型運算仍然會落到 GPU 上執行 Matrix Multiplication、Attention 與其他 Tensor Operations。因此 GPU Compute Throughput、GPU Memory Capacity、Memory Bandwidth、PCIe、NVLink 與 Network Bandwidth 都會直接影響整個系統的效率。如果模型權重本身就超過單張 GPU 的 VRAM，那麼單純把程式寫得更漂亮並沒有用，系統一定需要跨 GPU 拆分模型。這也是為什麼 AI Infra 往往必須同時理解 Software Abstraction 與底層 Hardware Constraint。

有了 GPU 之後，下一個問題是誰可以使用這些 GPU。假設一個 Cluster 中有四台機器，每台各有八張 GPU，同時進來一個需要 16 張 GPU 的 Training Job、一個需要 8 張 GPU 的 Fine-tuning Job，以及數個 Inference Workload，這時就需要 Scheduler 負責資源分配。Kubernetes 是目前常見的底層 Resource Manager，它可以將 GPU 暴露成可排程的 Resource，再由 Pod 宣告自己需要多少 GPU。對 AI Workload 來說，Scheduling 又比一般 Web Service 更困難，因為 Distributed Training 通常需要一次拿到一整組 GPU 才能開始執行，而不是先拿到一兩張再慢慢增加。這類需求就是 Gang Scheduling 與 Workload-aware Scheduling 會出現的原因。

不過，Kubernetes 解決的是「程式應該在哪台機器上執行」，它並不直接負責應用程式內部的 Distributed Execution。假設我們有 10 TB 的資料，希望把 Preprocessing 工作拆到幾十台 Worker 上執行，還是需要另一層系統管理 Task Dependency、Worker Lifecycle、Data Transfer 與 Failure Recovery。這就是 Distributed Runtime 的角色。以 Ray 為例，它提供 Task、Actor 與 Object Reference 等基本抽象，讓開發者不需要自己管理 Socket、Process 與 Machine Address，就可以把工作分散到 Cluster 中。

---

## GPU 很快，但資料可能根本跟不上

這一層之所以重要，是因為 AI Pipeline 很少只有模型計算。實際工作負載通常會先從 Storage 讀取資料，再經過 Decode、Transform、Shuffle、Batch，最後才送進 GPU。如果 CPU Preprocessing 需要 500 毫秒，而 GPU 真正計算只需要 50 毫秒，那麼即使 GPU 本身非常快，大部分時間仍然只能等待資料。很多實際的 AI Performance 問題最後甚至不是 GPU Compute 不夠，而是 I/O、Serialization、Network Transfer、Memory Copy 或 CPU Preprocessing 太慢。這也是 Data Plane 在 AI Infra 裡的重要性。

所謂 Data Plane，可以先把它理解成負責讓資料在 Storage、Memory、Network 與 Compute 之間有效率流動的那一層。這個問題看起來和 LLM Serving 相距很遠，但其實非常重要。為什麼 Parquet 採用 Columnar Layout？為什麼 Apache Arrow 強調 In-memory Columnar Format？為什麼 Zero-Copy 值得特別討論？為什麼 Distributed System 一直強調 Data Locality？背後的核心原因都是資料移動有成本。CPU 很快、GPU 更快，但如果資料一直在 Disk、Memory 與 Network 之間反覆 Copy，整體吞吐量仍然可能非常差。

![資料從 Object Storage 經過讀取、解碼、轉換與批次處理後才進入 GPU；時間軸顯示 GPU 可能因等待資料而閒置。](/posts/ai-infrastructure-day-01/gpu-data-bottleneck.png)

> 圖三：GPU 的計算速度可能遠快於資料準備速度，I/O、CPU preprocessing 與資料移動都會讓 GPU 閒置。

Distributed Data Processing 進一步又會遇到 Execution Engine 的問題。一個 Data Pipeline 通常可以表示成 DAG，例如 Read、Map、Filter、Shuffle、Aggregate 與 Write，但 DAG 只描述了「要做什麼」，真正的 Execution Engine 還必須決定「要怎麼做」。兩個相鄰的 Map Operator 是否可以 Fusion？資料是否一定要等全部讀完後才開始下一個 Operator？一個 Shuffle 應該如何切 Partition？系統應該一次 Materialize 整份資料，還是讓 Block 一產生就往下游傳？這些問題和 Database Query Engine 非常接近，因此我們會看到 Logical Plan、Physical Plan、Optimizer、Operator Fusion 與 Streaming Execution 等概念出現在 AI Data Infra 裡。

當資料終於抵達 GPU，問題又會轉向另一組資源管理機制。GPU Memory 不只需要容納 Model Weights，在 Training 階段還可能放 Activations、Gradients 與 Optimizer States；在 LLM Inference 階段則會大量使用 KV Cache。因此，「GPU 還剩多少 Memory」會直接決定模型能不能放得下、Context 可以多長，以及同時可以服務多少個 Request。模型如果太大，還必須使用 Data Parallelism、Tensor Parallelism、Pipeline Parallelism 或 Expert Parallelism，把工作拆到多張 GPU 甚至多個 Node 上。GPU 之間則需要透過 AllReduce、AllGather、ReduceScatter 等 Collective Communication 交換資料。

---

## LLM Serving 其實也是資源管理

到了 LLM Serving，AI Infra 又呈現出另一種很有趣的樣子。最簡單的模型服務可以把每個 Request 單獨送進 Model 執行，但當數百個使用者同時產生 Token 時，這種方式幾乎不可能有效率使用 GPU。Inference Engine 必須決定哪些 Request 可以一起執行、誰應該先 Decode、完成的 Request 如何立即離開 Batch，以及釋放出來的 GPU Memory 如何重新分配給新的 Request。像 vLLM 這類系統提供 Continuous Batching、PagedAttention、Prefix Caching 與 Chunked Prefill 等機制，本質上都在改善 Scheduling、Memory Management 與 Resource Utilization。

KV Cache 是其中最典型的例子。大型語言模型在 Autoregressive Decoding 時，每產生一個新的 Token，都需要利用先前 Token 的 Attention State。如果每次都從頭重新計算整段 Context，成本會非常高，因此 Inference Engine 會把 Key 與 Value 保存在 GPU Memory 裡供後續重用。這些 Cache 會隨著 Context Length 與 Concurrent Requests 增加，因此在高併發 Serving 中，真正限制 Capacity 的往往不只是 GPU Compute，而是 GPU Memory。這也是為什麼現代 LLM Serving Engine 在某些角度上很像一個小型 Operating System：它需要管理 Request、Scheduling、Memory Block 與有限的 Accelerator Resource。

![Operating System 與 LLM Inference Engine 的概念對照：Process 對應 Request、CPU Scheduler 對應 Request Scheduler、Virtual Memory 對應 KV Cache Manager，RAM 對應 GPU Memory。](/posts/ai-infrastructure-day-01/os-llm-inference-comparison.png)

> 圖四：LLM inference engine 的 scheduling 與 memory management，和 Operating System 有相似的系統問題。

LLM Inference 還有另一個重要特性，就是 Prefill 與 Decode 並不是完全相同的 Workload。Prefill 需要一次處理整段 Prompt，通常具有較高的 Parallelism；Decode 則是一個 Token 接著一個 Token 產生，對 Memory Bandwidth 與 Latency 更敏感。正因為兩個階段的資源特性不同，近年開始出現將 Prefill 與 Decode 分開部署的 Disaggregated Serving 架構。也就是說，同一個模型的不同 Execution Phase，甚至可能由不同 GPU Worker 負責。這已經不是單純「把模型部署到 Server」，而是在針對模型的計算特性設計 Distributed System。

如果把前面的技術放在一起，其實可以發現一條非常一致的主線。Parquet 處理的是如何減少不必要的資料讀取；Arrow 與 Zero-Copy 關心如何減少 Memory Copy；Data Locality 關心如何避免昂貴的 Network Transfer；Task Scheduling 決定 CPU 與 Worker 怎麼分配；Object Store 管理 Distributed Memory；GPU Scheduler 決定 Accelerator 怎麼配置；KV Cache Management 則處理有限的 GPU Memory；Continuous Batching 的目標則是提高 GPU Utilization。這些技術看似分散，實際上都在處理同一件事情：**如何有效率地管理有限資源，以及如何減少不必要的資料移動與等待。**

這也是 AI Infra 和 MLOps 最容易混淆、但又可以稍微區分的地方。MLOps 通常更偏向 Model Lifecycle，例如 Experiment Tracking、Training、Evaluation、Model Registry、Deployment 與 Monitoring；AI Infra 則更關注 Workload Execution，也就是資料怎麼進來、計算怎麼分散、資源怎麼配置、GPU 怎麼被使用，以及服務怎麼擴展。實際公司中兩者經常由同一個 ML Platform 或 AI Platform Team 負責，因此邊界沒有必要切得過度嚴格，但理解兩者關注的核心問題仍然很有幫助。

AI Infra 與 Cloud Infra 的關係也是如此。AI Infra 並沒有重新發明 Compute、Storage、Networking、Container、Load Balancing 與 Observability，而是建立在這些基礎上，加入 GPU、VRAM、Model Weight、KV Cache、Tensor Parallelism 與 Token Generation 等新的 Constraint。過去一個 Scheduler 也許只需要知道某個 Workload 需要 8 顆 CPU 和 32 GB RAM，現在它還可能需要考慮 GPU 型號、GPU 數量、Topology、VRAM 與工作是否需要整組 Accelerator 同時配置。因此，把 AI Infra 看成 Distributed / Cloud Infra 對 AI Workload 的 Specialization，通常會比把它想成一個全新的領域更準確。

當這些 Layer 全部接起來後，最後一定還會碰到 Observability。使用者只會說一句「今天模型變慢了」，但背後可能是 Request Queue 變長、Data Pipeline 變慢、GPU Utilization 下降、KV Cache 快滿、Prefill 時間增加，或 Decode 的 Inter-token Latency 惡化。因此現代 AI System 除了傳統 CPU、Memory、Disk 與 Network Metrics，還需要觀察 Queue Time、Time to First Token、Inter-token Latency、Tokens per Second、KV Cache Usage、Batch Size 與 GPU Utilization。

因此，如果要替這個系列接下來 30 天留下一個最重要的定義，我會把 AI Infra 描述成： **把有限的 Compute、Memory、Network 與 Storage，轉換成能讓 AI Workload 穩定、高效率並且大規模執行的系統。** 模型本身當然重要，但模型只是整個 AI System 中的一部分。模型之前有 Data Plane，模型下面有 GPU 與 Resource Scheduler，模型周圍有 Distributed Runtime，模型上線之後還有 Inference Engine、Serving Layer 與 Observability。

這也是這個系列叫做《模型之外》的原因。接下來的內容不會花太多篇幅討論 Transformer 有幾層、Attention 的公式怎麼推導，或哪一個模型的 Benchmark 比較高。我們要追的是另一條路：資料如何流進系統、工作如何被切分、資源如何被排程、記憶體如何被管理、GPU 如何互相溝通，以及一個 Request 最後究竟怎麼穿過這些 Layer。走到最後會發現，AI Infra 看起來是一個很新的領域，但它處理的核心問題其實非常熟悉。

**AI Infra 最後仍然是 Systems。只是今天，我們管理的資源從 CPU、RAM 與 Disk，逐漸變成了 GPU、VRAM、Tensor、KV Cache 與 Token。**

下一篇，我們就從最貼近使用者的地方開始，看 **一個 AI Request 背後到底發生了什麼？**