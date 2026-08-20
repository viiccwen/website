---
title: "模型之外：Data Locality：為什麼搬資料這麼昂貴？"
published: 2026-08-24
description: "從資料搬移成本與排程取捨理解 data locality"
image: "/posts/ai-infrastructure-day-08/data-distance-from-compute.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

Day 07 談到，資料可以用 Block 的形式在 Pipeline 裡逐步往下游流。當 Execution Engine 把這些 Block 分到多台機器，下一個問題就變得很實際：**下一個 Task 應該跑在哪裡？**

假設 Node A 已經有一個 2 GB input object，而某個 Task 可以在 A、B、C 任一台執行。排到 A，Worker 直接讀本地資料；排到 C，Task 開始前，這 2 GB 得先跨 Network 搬過去。Task 本身可能只跑 500 ms，搬資料卻花得更久。

這就是 **Data Locality**：盡量讓 Compute 靠近已經存在的 Data，避免不必要的 Data Movement。

它不是永遠選資料所在的 Node 這麼簡單。Scheduler 還得比較資料大小、等待時間、可用 CPU／GPU 與網路狀態。所以搬資料到底貴在哪裡？以及什麼時候值得為了 Locality 改變 Placement？

## 資料離 Compute 有多遠？

Data Locality 不只發生在 Node 之間。同一台機器裡，資料可能在 CPU Cache、Host DRAM 或 Local SSD；跨 Node 後，還會經過 NIC 與 Network Fabric。GPU 工作則常得把 Tensor 從 Host Memory 送進 GPU Memory。

因此常常遇到一種情況，**資料越遠，參與搬移的元件越多，成本也越難忽略。**

![資料距離 Compute 越遠，搬移路徑越長](/posts/ai-infrastructure-day-08/data-distance-from-compute.png)

> 圖一：從本機記憶體走到遠端 Node 或 Object Storage 時，搬移會牽涉更多記憶體、I/O 與網路元件

分散式 Runtime 通常能直接決定的是 Node、Rack 或 Accelerator 等粗粒度 Placement；CPU Cache 與 NUMA Locality 多半是 Worker、Runtime 與硬體共同造成的結果。

以跨 Node 傳一個 1 GB Object 為例，若有效吞吐量是 10 GB/s，光網路傳輸的理論下限就約 100 ms。實際上還得從來源記憶體讀出資料、經 NIC 與 Switch 傳送、再寫進目的端記憶體；Runtime 也要處理 Buffer、Object Location 與可能的格式轉換。

所以 CPU、GPU 都沒有跑滿，Job 還是可能很慢。瓶頸不一定在 Compute，而可能是多個 Worker 正在爭用共享網路的頻寬。100 個 Worker 同時搬大 Block 時，所有傳輸都可能一起變慢。

## 搬 Data 還是搬 Compute？

Node A 有 2 GB Object，Node B 有空閒 CPU。Scheduler 可以把 Object 拉到 B，也可以把 Task 的 Function 與 Metadata 送到 A。

若 Task 能在任一 Node 執行，而 Function 本身很小，後者通常便宜得多。這也是 Distributed Data Processing 的基本原則：**資料大、Compute 可移動時，優先把 Compute 排到 Data 附近。**

![Move data 與 move compute 的排程取捨](/posts/ai-infrastructure-day-08/move-data-vs-compute.png)

> 圖二：輸入很大而 Task 可以移動時，將 Compute 放到 Data 所在地，通常比跨 Network 搬運大型 Object 更有效率。

不過 Locality 不是絕對規則。10 KB Argument 不值得為了不傳它而等待忙碌的 Node；反過來說，20 GB Object 即使只要多等幾百毫秒，也可能比立刻跨網路傳送划算。

因此 Scheduler 實際上在比的是總成本：`total cost = waiting cost + compute cost + data transfer cost`

最 Local 的 Node 不一定最好。Node A 雖然有資料，CPU 卻已滿載；Node B 沒有資料，但有大量空閒 CPU。若 Task 要算十秒，而資料傳輸只要一百毫秒，等 A 反而會拖慢整個 Job。

對 Batch Job，目標通常是縮短整體完成時間、提高 Throughput；對線上服務，則更在意單一 Request 的 Latency。Locality 只是 Scheduler 用來達成這些目標的一個訊號，不是唯一規則。

## 如何把 Locality 放進排程？

在分散式系統裡，提交一個工作時，系統通常得分開處理兩件事：Task 要做什麼，以及它的輸入資料目前在哪裡。

Task 的程式碼、設定與 Metadata 往往很小；真正昂貴的，是幾 GB 的輸入資料。Runtime 會追蹤大型資料位於哪些 Node，Scheduler 再依照資料位置、可用 CPU／GPU 與等待時間，決定 Task 應該跑在哪裡。

如果某個 Node 已經有輸入資料的本地副本，Scheduler 可以直接把 Task 放過去；若選了另一台 Node，系統就得先把資料拉過去，Task 才能開始。

不同 Runtime 會用不同方式保存這些位置資訊：有些藏在 Execution Plan 裡，有些提供明確的資料參照。Ray 的 `ObjectRef` 是其中一種；提交 Task 時，傳遞的是對資料的參照，而不是每次都把完整 Payload 直接塞進 Task。若消費端沒有本地副本，資料仍然得跨 Node 傳輸。

Ray 是其中一種實作。大型 `ObjectRef` 作為 Task Argument 時，Ray 預設偏好已經有該 Object 本地副本、且有可用資源的 Node；若有多個大型 Argument，會偏好擁有較多本地 Object Bytes 的 Node。偏好的 Node 暫時不可用時，Task 才可能改排到其他可行的 Node。

## AI Pipeline 讓 Data Movement 更顯眼

AI Pipeline 的 CPU 與 GPU 通常不對稱。Cluster 可能有 100 台 CPU Worker，卻只有 8 台 GPU Node；前處理產生的大型 Block，最後都得流向少數 GPU Consumer。

如果 CPU Preprocess 均勻散在整個 Cluster，GPU 又集中在另一組 Node，Network 很容易變成漏斗。GPU 算得再快，拿不到下一批資料還是會 Idle。

![CPU producer 匯入 GPU consumer 的資料搬移瓶頸](/posts/ai-infrastructure-day-08/cpu-to-gpu-locality.png)

> 圖三：大量 CPU Producer 將資料送往少數 GPU Consumer 時，Placement 與 Network Capacity 若沒有一起考慮，Data Movement 很容易成為 Accelerator 前的瓶頸。

這裡除了 Input Locality，還要看產生的資料下一步要送往哪裡。下游若是位置固定的 GPU Consumer，在附近先完成部分 Preprocessing，可能少一次中間搬移；這類取捨可視為 Output Locality。

有些操作本來就必須重新分布資料，例如 Shuffle；這會在 Day 21 詳談。

## 把 Data Movement 當成 Execution Cost

今天的重點不是「資料一定不能搬」。有些 Task 算得夠久、有些 Node 足夠閒、有些 Operation 本來就需要重新分布資料；這些情況都可能值得搬。

但 Network 不是免費的。一次 Transfer 同時使用來源與目的端記憶體、NIC、Network Fabric 和 Buffer；資料若還要送進 GPU，又多一段 Host-to-Device Transfer。Data Size、Topology 與 Contention 都會改變這筆成本。

可以把這幾天的內容連起來看：Parquet 避免從 Storage 讀出不需要的 Column；Arrow 避免資料跨 Framework 又 Copy 一份；Data Locality 則避免已在 Cluster 內的 Block 無故再跨 Network 搬一次。

下一篇會接著問：即使每個 Task 都放得很 Local，上游還是持續產生 Block，而下游吃不完時，系統要怎麼叫它慢下來？這就是 **Backpressure：資料跑太快為什麼也會出問題？**

## References

* [Ray Core Scheduling — Locality-Aware Scheduling](https://docs.ray.io/en/latest/ray-core/scheduling/index.html)
* [Ray Objects — Passing Object Arguments](https://docs.ray.io/en/latest/ray-core/objects.html)
* [MapReduce: Simplified Data Processing on Large Clusters](https://research.google/pubs/pub62/)
* [NVIDIA CUDA C++ Best Practices Guide](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/)
