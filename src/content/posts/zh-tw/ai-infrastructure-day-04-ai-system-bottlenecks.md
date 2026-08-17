---
title: "模型之外：AI 系統的瓶頸，為什麼常常不是 GPU？"
published: 2026-08-20
description: "辨認資料、網路、CPU、排隊與 GPU 記憶體等 AI 系統常見瓶頸。"
image: "/posts/ai-infrastructure-day-04/input-pipeline-idle-gpu.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

前一篇我們談了 Latency、Throughput、QPS、Concurrency，以及 LLM Serving 裡常見的 TTFT、ITL 與 Tokens/s。這些指標讓我們有了一套描述系統效能的語言，但接下來真正困難的問題是：**當這些數字不好看的時候，到底是哪裡出了問題？**

很多人第一次遇到 AI 系統變慢時，直覺會先懷疑 GPU。畢竟模型最後確實是在 GPU 上執行，而且 GPU 通常也是整套系統最昂貴的硬體。如果 Training 變慢、Inference Throughput 上不去，最自然的反應就是「是不是 GPU 不夠快？」甚至直接考慮換成更高階的 GPU。但實際的 AI Pipeline 裡，GPU 只是整條 Execution Path 的其中一個 Stage。資料要先從 Storage 被讀取，經過 CPU Decode、Preprocessing、Batching，再從 Host Memory 傳到 Device Memory；Distributed Workload 還可能多出 Network Transfer、Shuffle、Serialization 與 Synchronization。只要其中任何一段速度跟不上，GPU 就只能等待。

PyTorch 官方的 Data Loading Optimization 教學直接把 Data Loading 描述為 Deep Learning Pipeline 中常見的 Critical Bottleneck，特別是在觀察到 GPU 因等待資料而產生 Idle Time 的情況。NVIDIA DALI 也提供專門的 Data Loading Bottleneck Detection 工具，目的就是判斷 GPU 是否因 Input Pipeline 太慢而等待資料。

因此 **AI 系統的效能由最慢的那一段決定，而不是由最快的硬體決定。**

## 一張很快的 GPU，不代表一套很快的系統

假設我們正在做圖片分類的訓練，一個 Batch 真正丟進 GPU 之後只需要 40 ms 就能完成 Forward、Backward 與 Optimizer Step。乍看之下，理論上每秒可以處理大約 25 個 Batch。但在 GPU 開始工作之前，系統還得從 Object Storage 讀取 Image Files、Decode JPEG、執行 Resize 與 Augmentation、組成 Batch，再把 Tensor 從 CPU Memory Copy 到 GPU Memory。如果這整段 Input Pipeline 需要 160 ms，那麼 GPU 每完成 40 ms 的工作，就可能要再等 120 ms 左右才能拿到下一批資料。

整個 Training Loop 從使用者角度看只是：

```python
for images, labels in dataloader:
    images = images.cuda()
    output = model(images)
    loss = criterion(output, labels)
    loss.backward()
    optimizer.step()
```

但真正的 Pipeline 更接近 `Storage → Read → Decode → Transform → Batch → Host-to-Device Copy → GPU Compute`。如果前半段速度跟不上後半段，GPU 即使擁有再高的 FLOPS，也不會憑空產生工作。NVIDIA 的 Deep Learning Performance 文件也特別指出，GPU 雖然擅長大量平行計算，但資料必須持續被載入與移動，因此 Data Movement 本身就可能限制最終能達到的效能。

這種情況可以叫做 **Input-bound** 或 **Data-bound**。GPU 本身可能完全沒有問題，只是沒有足夠的資料餵給它。這也是為什麼看到 GPU Utilization 很低時，不能立刻得出「GPU 太弱」這個結論；很多時候反而代表 GPU 太快，前面的 Pipeline 根本追不上它。

![Input pipeline 比 GPU 慢時，CPU 資料處理長時間執行，GPU compute 卻反覆等待下一個 batch。](/posts/ai-infrastructure-day-04/input-pipeline-idle-gpu.png)

> 圖一：當 Input Pipeline 的吞吐量低於 GPU 消耗資料的速度時，GPU 會反覆等待下一個 Batch；此時瓶頸不在 GPU，而在 Data Pipeline。

## Bottleneck 的本質，其實就是 Pipeline 中最慢的 Stage

這個問題不只存在於 AI。任何 Pipeline System 都有同樣的特性。假設一條生產線上有三個 Stage，第一個 Stage 每秒能處理 100 個 Item，第二個能處理 20 個，第三個能處理 80 個，那麼整條 Pipeline 不可能達到每秒 100 個 Item。長期穩定狀態下，它最多只能接近第二個 Stage 的 20 items/s，因為第二個 Stage 會成為 Bottleneck。

AI Pipeline 也是一樣。如果 Storage 每秒只能提供 2 GB 資料、CPU Preprocessing 能處理 4 GB/s，而 GPU 每秒能消耗 10 GB，那麼整體 Pipeline Throughput 不可能達到 10 GB/s。GPU 的理論 Capacity 很高，但真正可以被使用的速度受到前面 2 GB/s 的 Input 限制。

換個方向看，如果 Storage 和 CPU 都很快，但 Host-to-Device Transfer 特別慢，那 Bottleneck 就會移到 PCIe；如果單機內全部很快，但 Distributed Training 每一輪都要等 AllReduce，那 Network 或 Collective Communication 就可能變成 Bottleneck；如果所有 Worker 都很快，但每個 Stage 最後都要等待最慢的那台機器完成，那 Straggler 又會成為新的 Bottleneck。因此「AI 系統的瓶頸」不是某個固定 Component，而是**整條 Critical Path 中目前限制 Throughput 或 Latency 的那個資源或 Stage**。

這也代表 Bottleneck 會移動。假設我們成功把 Dataset 全部 Cache 到本地 SSD，Storage Throughput 從 2 GB/s 提升到 8 GB/s，那原本的 Storage Bottleneck 消失之後，CPU Decode 可能立刻變成下一個限制。如果接著又把 Decode Parallelize，PCIe Transfer 可能再成為下一個 Bottleneck。Performance Optimization 經常就是這樣一層一層揭開：解掉一個瓶頸，不代表系統沒有瓶頸，只代表**下一個瓶頸現在終於看得見了**。

![三段相同的 Storage、CPU preprocessing、H2D transfer 與 GPU pipeline，分別標示優化前後移動的 bottleneck。](/posts/ai-infrastructure-day-04/bottleneck-moves.png)

> 圖二：系統中的 Bottleneck 不是固定位置。當一個 Stage 被加速後，限制整體效能的因素可能轉移到另一個 Stage。

## 第一種常見瓶頸：Storage 與 I/O

很多 AI Pipeline 的第一個瓶頸甚至在資料剛離開 Storage 時就出現了。Dataset 可能存放在 Local SSD、Network File System 或 Object Storage 中，而 Workload 每一輪都需要讀取大量 Image、Audio、Parquet 或其他檔案。如果 Read Throughput 比後面的 Compute 慢，整個 Pipeline 就會被 Storage 吞吐量限制。

小檔案特別容易造成問題。假設 Dataset 有一億個只有幾 KB 的檔案，即使總容量不算巨大，每個檔案仍然涉及 File Open、Metadata Lookup 或 Network Request。這時問題未必是 Disk 的 Sequential Bandwidth 不夠，而可能是大量 Random I/O 與 Metadata Operation。相反地，把大量 Records 組合成較大的 Parquet、WebDataset 或其他適合 Sequential / Batched Read 的 Format，往往能減少這類固定成本。

這也是 Data Format 為什麼會影響 AI Infra，而不只是「檔案怎麼存」的問題。Row-based、Columnar Layout、Compression、Partitioning 與 File Size 都會改變資料從 Storage 被讀進 Compute 的成本。下一篇 Day 05，我們就會從 Row-based vs Columnar 開始，把這一層拆得更仔細（去年 ClickHouse 系列也有提到一樣的主題）。

在分散式環境中，Storage Bottleneck 又更複雜。如果數百個 Worker 同時從同一套 Object Storage 或 Shared Filesystem 讀資料，Aggregate Bandwidth 可能很快被打滿；某些 Worker 又可能因為 Data Placement 不同而需要跨 Network 取資料。這也是為什麼真正的大型 AI Pipeline 不只關心「SSD 多快」，還需要一起看 Storage Throughput、File Layout、Concurrent Readers、Caching 與 Data Locality。

## 第二種常見瓶頸：CPU Preprocessing

資料讀進來之後，通常還不能直接送進 GPU。Image 可能需要 JPEG Decode、Resize、Crop 與 Augmentation；Audio 可能需要 Decode、Resampling 或 Feature Extraction；文字資料則可能要 Parse、Tokenize、Filter 或組合 Prompt。這些工作很多預設會發生在 CPU。

如果只有一個 DataLoader Worker，而 GPU 每 20 ms 就需要一個新的 Batch，CPU 很容易供應不及。這也是 PyTorch `DataLoader` 提供多個 Worker、Prefetch 與 Pinned Memory 等選項的原因：目標不是讓 Model 本身算得更快，而是讓 Input Pipeline 能與 GPU Compute Overlap。PyTorch 近期的 Data Loading Optimization 教學同樣把「GPU 因 Data Loading 而 Idle」當成主要優化情境。

NVIDIA DALI 採取更進一步的方法，將部分資料載入與 Preprocessing 工作移到高度最佳化的 CPU/GPU Pipeline；其官方文件明確指出，原本在 CPU 上進行的 Data Processing 可能成為限制 Training 與 Inference Scalability 的 Bottleneck。

不過，這裡也不能簡化成「`num_workers` 越多越好」。增加 Worker 會消耗更多 CPU Core、Memory、File Descriptor，也可能提高 Storage Contention。如果資料本來已經被 Cache 在 Memory、每個 Transform 非常輕，開過多 Process 甚至可能因 Scheduling、IPC 或 Serialization Overhead 讓效能下降。真正該問的是：**CPU Stage 是否真的限制了 Pipeline Throughput，以及增加 Parallelism 後，Throughput 是否仍然持續提升。**

## 第三種常見瓶頸：Memory Copy 與 Data Movement

即使 Storage 和 CPU 都很快，資料仍然要從一個地方移到另一個地方。這件事情常常比想像中昂貴。

一筆資料可能先從 SSD 進入 OS Page Cache，再進到 Python / Framework 所管理的 Memory，經過 Format Conversion 後產生新的 Buffer，最後再從 Host Memory Copy 到 GPU Memory。Distributed Pipeline 還可能需要先 Serialize 成 Network Payload，在另一台機器 Deserialize，再複製到另一個 Object 或 Tensor。每一次 Copy 都會消耗 Memory Bandwidth、CPU Cycle 或 Network Bandwidth，也可能增加額外的 Memory Footprint。

因此 Performance Engineering 裡有一個很重要的原則：**不要只看 Compute，要看 Data Movement。** NVIDIA 的 Deep Learning Performance 文件同樣強調，GPU 計算之外，資料的載入與移動速度也可能限制最終效能。

這也是為什麼接下來 Day 06 會專門談 Apache Arrow 與 Zero-Copy。Arrow 的重要性並不只是「它是一個 Columnar Format」，而是它提供一套跨系統共享 In-memory Data 的標準 Layout，讓不同 Runtime 在某些情況下可以避免反覆 Serialization 與 Copy。對單筆幾 KB 的資料來說，一次 Copy 可能不值得在意，但到了數十 GB、數百 GB，甚至跨大量 Worker 的 Pipeline 時，Memory Copy 本身就可能成為很實際的系統成本。

![資料從 storage 到 GPU HBM 的記憶體路徑，途中可能產生多次 buffer copy；下方對照 CPU 端可共享的零拷貝表示法。](/posts/ai-infrastructure-day-04/data-copy-path.png)

> 圖三：資料從 Storage 到 GPU 途中可能經過多次 Buffer Allocation、Serialization 與 Memory Copy；在大型 Pipeline 中，Data Movement 本身就可能成為主要成本。

## 第四種常見瓶頸：Serialization 與 Python Overhead

在 Distributed AI Workload 裡，資料不只需要移動，還需要先被表示成可以移動的形式。Python Object、Pandas DataFrame、NumPy Array、Arrow Table 與 Tensor 的序列化成本並不相同。如果每個 Task 都傳送大量複雜 Python Object，Worker 很可能花很多時間在 Pickle、Serialize、Deserialize，而不是做真正有價值的計算。

另外一個容易忽略的是 Task Granularity。如果我們把非常小的工作拆成數百萬個 Distributed Task，每個 Task 真正 Compute 只需要 100 μs，但 Scheduling、Serialization 與 RPC Overhead 卻需要數百 μs，那麼 Runtime 很可能花比計算更多的時間在管理 Task。這種問題和 GPU 強弱完全無關，換一張更快的 GPU甚至可能讓情況更糟，因為真正 Compute 變得更短之後，固定的 Scheduling Overhead 占比反而更高。

所以 Distributed Runtime 通常需要在 Parallelism 和 Overhead 中取得平衡。Task 太大，Parallelism 不足；Task 太小，又會產生大量 Scheduling 與 Communication Cost。這也是之後 Day 10～16 談 Task、Actor、Future、Object Store 與 Scheduling 時會反覆遇到的核心問題。

## 第五種常見瓶頸：Network

一旦 Workload 跨出單機，Network 幾乎一定會進入 Critical Path。Data Processing 中的 Shuffle 需要把 Partition 從一台 Worker 傳到另一台；Distributed Training 中的 Gradient Synchronization 需要 GPU 彼此交換 Tensor；Distributed Inference 也可能需要在不同 GPU 之間傳輸 Intermediate State 或 KV Cache。

假設一個 Worker 每秒產生 20 GB 的 Intermediate Data，但 Network 只能穩定傳送 10 GB/s，那麼再增加 CPU Worker 並不會讓整體 Pipeline 更快，因為資料只會更快堆在 Network 前。這和前面的 Storage Bottleneck 是同一個概念：**上游產生資料的速度大於下游消耗速度時，中間一定需要等待、Buffer，或施加 Backpressure。**

Data Locality 在這裡就非常重要。如果資料原本已經存在 Node A，而 Task 被 Scheduler 放到 Node B，那麼這份資料可能需要先跨 Network 移動。相反地，如果 Task 能直接排到 Node A，就能省掉一次昂貴的 Network Transfer。Ray 的 Scheduler 也會把大型 Task Argument 的 Locality 納入 Node Selection，盡可能讓計算靠近資料。

Day 08 我們會專門討論這件事情，而 Day 21 的 Shuffle 更是會把 Network、Partition、Memory 與 Disk 全部拉到同一個問題裡。

## 第六種常見瓶頸：Stage 之間沒有 Overlap

還有一種系統看起來每個 Component 都不慢，但整體仍然很慢，原因是不同 Stage 被迫串行執行。

假設一個 Batch 需要 80 ms CPU Preprocessing，再需要 40 ms GPU Inference。如果整個流程完全 Sequential，那每個 Batch 就要 120 ms。但如果 CPU 可以在 GPU 處理 Batch N 的同時準備 Batch N+1，那穩定狀態下兩個 Stage 就可以 Overlap，整體 Throughput 不再是單純把 80 ms 和 40 ms 相加，而會逐漸接近最慢 Stage 的速度。

Ray Data 的 Streaming Execution 就是類似思路。它不要求上一個 Operator 完整處理完所有資料後，下一個 Operator 才開始，而是可以讓不同 Stage 在資料 Block 逐步產生時重疊執行。Ray 官方文件也特別指出，Streaming Execution 能讓 CPU 與 GPU Stage 同時運作，例如 CPU Filter 與 GPU Map 並行，以提高整體 Resource Utilization。

這個觀念之後會成為 Day 07 與 Day 20 的主角，但現在先記住一件事情：**提高 GPU Utilization 不一定需要讓 GPU 本身更快，有時只要讓前後 Stage 能夠 Overlap，就能少掉大量 Idle Time。**

![CPU 與 GPU 在 sequential execution 中輪流閒置；在 pipelined execution 中則讓 batch preparation 與 compute 重疊。](/posts/ai-infrastructure-day-04/sequential-vs-pipelined.png)

> 圖四：即使每個 Stage 本身沒有變快，只要讓 CPU Data Preparation 與 GPU Compute 重疊執行，就可能顯著提高整體 Pipeline Throughput。

## 第七種常見瓶頸：Memory Pressure 與 Spilling

Memory 不夠也不一定會直接 Crash。有些 Distributed System 會先把 Object、Intermediate Result 或 Partition Spill 到 Disk，等需要時再讀回來。從穩定性的角度看，這比直接 OOM 好很多；但從 Performance 的角度看，Disk 和 Memory 的速度差距可能非常大，因此一旦進入大量 Spilling，Throughput 很容易突然下降。

Ray Data 使用 Streaming Execution 的其中一個目的，就是控制 Working Set，避免所有 Intermediate Data 一次 Materialize 在 Object Store。不過官方文件也指出，即使使用 Streaming Execution，如果 Working Set 仍然超過 Object Store Capacity，依然可能發生 Disk Spilling，而這會降低 Performance。

這是一個很典型的案例：真正的 Bottleneck 表面上看起來可能是「Disk 很慢」，但根本原因其實是「Memory Pressure 讓系統不得不 Spill」。因此做 Performance Debugging 時不能只看最終症狀，而要理解系統的 Resource Management 行為。

到了 LLM Serving，這個概念也會再次出現，只是 Object Store Memory 會換成 GPU Memory，Intermediate Object 會換成 KV Cache。資源滿了之後，系統必須選擇 Reject、Evict、Recompute、Offload，或降低 Concurrency。Day 15 和 Day 25 會分別從 Distributed Runtime 與 LLM Serving 的角度重新討論 Memory Pressure。

## GPU Utilization 很低，到底代表什麼？

看到 GPU Utilization 只有 30%，最容易得到的結論是：「我們只用了 GPU 的 30% 效能。」但這個理解需要非常小心。首先，不同工具對 GPU Utilization 的定義可能不同；例如一些監控值描述的是某個 Sampling Window 內 GPU 是否有 Kernel 在執行，而不是 Tensor Core、Memory Bandwidth 與所有 Execution Unit 都真的使用了多少百分比。因此只看單一 Utilization 百分比，很難完整判斷 Bottleneck。

更重要的是，低 Utilization 本身只是一個**症狀**。它可能代表 DataLoader 太慢，也可能是 Batch 太小、CPU Launch Overhead 太高、GPU Kernel 太碎、Synchronization 太多，或 Workload 本身就沒有足夠的 Parallelism。NVIDIA DALI 的 Loader Evaluator 正是透過模擬近乎零成本的 Data Loading，再比較 Training Throughput，來判斷 Input Pipeline 是否真的是 Bottleneck；官方也建議進一步使用 Nsight Systems 觀察 GPU Kernel、CPU Thread、Memory Transfer 與 Synchronization Timeline。

換句話說：

> **GPU Utilization 低不能告訴你原因，只能告訴你 GPU 沒有一直做有效工作。**

接下來真正要做的是 Profiling。

## 量測 Bottleneck

Performance Debugging 最危險的方式，就是憑感覺優化。

例如看到 GPU Utilization 很低，就先把 GPU 換成更快的型號；看到 DataLoader 很慢，就把 `num_workers` 從 8 拉到 64；看到 Network Traffic 很高，就增加 Bandwidth。這些做法偶爾會有效，但如果沒有先找出 Critical Path，很容易花大量成本優化一個根本不是 Bottleneck 的 Component。

比較合理的方式是先把整條 Pipeline 分解。對 Training Workload，可以觀察 Data Loading Time、CPU Preprocessing Time、H2D Copy、Forward、Backward、Optimizer Step 與 Communication；對 Online Inference，則可以拆成 Queue Time、Prefill、Decode、KV Cache Usage、Batch Size 與 Streaming Delay；對 Distributed Data Pipeline，再加上 Object Store Memory、Spilling、Task Duration、Shuffle Throughput 與 Backpressure。

Ray Data 的 Monitoring 介面例如會顯示各 Operator 的 Task、Object Store Memory、Spilled Bytes 與 Backpressure 等資訊，讓使用者不只是看到「整個 Job 花了多久」，而能往 Execution Stage 裡面找。

真正有效的 Performance Analysis 通常是在回答：**GPU 在算，還是在等？CPU 在算，還是在等 I/O？Network 在傳資料，還是 Worker 在等 Network？Memory 是否足夠，還是系統正在 Spill？Queue 變長是因為 Admission Rate 太高，還是單一 Request 變慢？**

只要把「誰正在等誰」畫出來，很多 Bottleneck 就會開始變得明顯。

![由 Storage I/O、CPU worker、H2D copy、GPU kernel 與 network 組成的 profiling timeline，比較 I/O-bound、CPU-bound 與 communication-bound 的等待關係。](/posts/ai-infrastructure-day-04/profiling-waiting-timeline.png)

> 圖五：Profiling 的核心不是只找出哪個 Resource Utilization 最高，而是觀察不同 Stage 的依賴與等待關係，找出真正位於 Critical Path 上的 Bottleneck。

---

## Compute-bound、Memory-bound、I/O-bound 到底是什麼？

做到這裡，會開始看到很多 Performance Article 使用 `compute-bound`、`memory-bound`、`I/O-bound` 或 `communication-bound` 這些詞。它們本質上都是在描述「目前哪一種資源限制了效能」。

如果大量 Matrix Multiplication 已經把 GPU Compute Unit 壓到極限，即使再增加 Memory Bandwidth，執行速度也不太會改善，那可以把它看成 Compute-bound。相反地，如果 GPU ALU 還有餘裕，但資料無法以足夠速度從 HBM 餵進 Execution Unit，效能主要受到 Memory Bandwidth 限制，就是 Memory-bound。NVIDIA 的 Kernel Profiling 文件也會把 GPU Performance 拆成 Compute 與 Memory Workload 等不同面向，而不是只看一個整體 Utilization。

I/O-bound 則通常表示 Storage 或 Input Device 的速度限制了 Pipeline；Communication-bound 常用來描述 Distributed Workload 花大量時間等待 Network 或 Collective Communication。這些分類不是互斥而且永久不變的。同一個 Training Job 可能在 Data Loading 階段 I/O-bound、Forward Pass 某些 Operator Compute-bound，而 Distributed Synchronization 階段又 Communication-bound。

所以問「這個模型是 Compute-bound 還是 Memory-bound？」往往還不夠精確。更好的問題是：

> **哪一個 Stage，在目前的 Batch Size、Model Shape、Hardware 與 Concurrency 下，被哪個 Resource 限制？**

這才是 Systems 層級真正有意義的問題。

## 為什麼更快的 GPU 有時反而讓問題更明顯？

這裡有一個很反直覺的現象。假設舊 GPU 每個 Batch 需要 100 ms，而 Data Pipeline 需要 80 ms。因為 CPU 可以在 GPU 工作時準備下一個 Batch，所以資料大多來得及供應，整體看起來很正常。

現在換成兩倍快的 GPU，每個 Batch 只需要 50 ms，但 Data Pipeline 還是需要 80 ms。GPU 反而開始大量 Idle。GPU 本身確實快了一倍，整個 End-to-end Throughput 卻不會跟著快一倍，因為 Bottleneck 已經從 GPU Compute 轉移到 Data Pipeline。

NVIDIA 在 CUDA Graph 的案例中也展示過類似的 Bottleneck Shift：當低精度計算讓 GEMM 變得更快後，原本相對不重要的 CPU Kernel Launch Overhead 可能開始成為限制，因此需要用 CUDA Graph 減少 Host-side Launch Cost。

這其實是一個非常普遍的 Systems 現象：**一個 Component 越快，周圍原本被掩蓋的 Overhead 就越容易暴露。**這也是為什麼新一代 GPU 推出之後，AI Infra 不只是把舊模型搬上去就能自動得到理論倍數的效能提升。Data Loader、Kernel Launch、Network、Storage、Batching 與 Runtime 都可能要一起重新調整。

## AI Infra 真正要優化的是整條 Pipeline

回頭看這四天的內容，就可以把整條故事串起來。Day 01 說 AI Infrastructure 管理的是 Compute、Memory、Network 與 Storage；Day 02 跟著一個 Request 看到了 Gateway、Queue、Inference Engine 與 GPU；Day 03 建立了 Latency 與 Throughput 的概念；而今天真正加入的關鍵是：**End-to-end Performance 取決於整條 Pipeline，而不是單一 Hardware Component。**

假設 GPU Utilization 很低，原因可能是資料來不及；如果 Throughput 上不去，可能是 CPU Preprocessing、Memory Copy 或 Network；如果 P99 Latency 很高，可能是 Queue 在負載接近 Saturation 後快速變長；如果 Distributed Job 突然變慢，也可能是 Object Store Memory 不夠導致 Spilling。這些問題都會在最終 Dashboard 上顯示成「Job 慢了」或「GPU 沒跑滿」，但根因完全不同。

因此，Performance Optimization 比較合理的順序不是先問「哪裡可以寫得更快」，而是先問三件事情：**資料從哪裡來？它沿途經過哪些 Stage？誰正在等待誰？**只要把這三件事情釐清，Bottleneck 通常就會從一個模糊的「AI 很慢」，變成一個可以被量測與處理的 Systems 問題。

而這也正好把我們帶進下一個段落。既然 Data Movement 經常會成為 AI Pipeline 的 Bottleneck，那資料在 Storage 裡究竟應該怎麼排列，才不會每一次都讀一堆根本用不到的內容？

下一篇我們從最基礎、也最容易被低估的一層開始： **Row-based vs Columnar：為什麼 Parquet 適合 ML？**
