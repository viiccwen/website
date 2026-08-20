---
title: "模型之外：Thread、Process、Task、Actor 到底差在哪？"
published: 2026-08-26
image: "/posts/ai-infrastructure-day-10/process-thread-memory.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

Day 09 談到，Pipeline 裡的工作會因為 Queue、Backpressure 與資源限制而被暫停或繼續。接下來要往下問：這些工作最後究竟由誰執行？

在單機程式裡，我們會遇到 Thread 和 Process。工作要分到多台機器時，還會多一層 runtime：它負責挑選資源、安排工作；Task 和 Actor 則是這一層用來描述工作的方式。

**Thread／Process 是 OS 的執行與隔離機制；Task／Actor 是 runtime 的工作抽象。**

前者決定程式碼在哪個執行環境裡跑，以及 Memory 如何隔離或共享；後者描述工作能否排程、是否要保留 state。先把這層分清楚，後面的 scheduler、object reference 和 actor 才不會混在一起。

## 先看四個概念位在哪一層

| 概念 | 層次 | 關心的事 |
| --- | --- | --- |
| Thread | OS 的基本執行單位 | 同一個 Process 裡的一條執行路徑 |
| Process | OS 的隔離單位 | Address space、資源隔離與 IPC |
| Task | runtime 的工作抽象 | 一份可被提交、排程與完成的工作 |
| Actor | runtime 的工作抽象 | 讓同一個 instance 跨呼叫持有 state |

不同 runtime 的 API 名稱和實作都會不同，但大方向相同：Task 和 Actor 最後仍要由某個 Process、Thread 與硬體執行。

## Thread 與 Process

當你啟動一個程式，OS 通常會建立一個 Process。它有自己的 virtual address space、程式碼、heap、file descriptors 與其他 OS 資源。

同一個 Process 可以有多個 Thread。Thread 各自有執行狀態與 stack，卻共享這個 Process 的 address space。因此 Thread A 修改 heap 裡的 object，Thread B 也看得到。

![Process 隔離 Address Space；同一個 Process 的 Thread 共享 Heap](/posts/ai-infrastructure-day-10/process-thread-memory.png)

> 圖一：Process 提供隔離；Thread 讓同一個 Process 內的工作低成本共享資料。

這帶來一個很直接的取捨。Thread 交換資料很便宜，但多個 Thread 同時修改同一份 state 時，必須處理 lock、race condition 或其他同步問題。Process 的隔離較強，不過跨 Process 交換資料得靠 pipe、socket、shared memory 等 IPC，成本與複雜度都更高。

所以沒有「Thread 一定比較輕、就應該多用」這種結論。I/O-bound 工作常能從 Thread 或 async concurrency 受益；CPU-bound 工作則還要看語言 runtime 和底層 library。

預設 CPython 有 GIL，同一個 Process 裡同一時間只能有一個 Thread 執行 Python bytecode。因此，多開 Python Thread 不會自動讓 CPU-bound Python code 用滿多核心。部分 native library 能釋放 GIL；Python 3.13 起也有實驗性、非預設的 [free-threaded build](https://docs.python.org/3.13/library/threading.html)。這只是提醒，不是所有 Python 工作的通則。

## Task 與 Actor

Task 是交給 runtime 的一份工作，它通常包含要執行的 function、input、依賴與結果；runtime 再決定何時、在哪個 worker 上執行。

例如一百萬張圖片各自 resize，這類工作通常沒有跨呼叫的 mutable state，因此很適合 Task。若 runtime 有 retry policy，而且工作具備 idempotency 或能對 side effect 去重，這些獨立工作也較適合重試或改在另一台 worker 重跑。Task 並非天生 stateless，而是不保留跨呼叫 state 的 Task 最容易重新排程與 load balance。

Actor 可以想成由 runtime 管理的一個 state owner。同一個 actor instance 的 method 可以存取它的 state：已載入的模型、connection pool、user session 或計數器都可以放在這裡。

Actor 的 state 不代表資料已經 durable。承載它的 worker 或 node 出問題後，in-memory state 仍可能消失；是否能重建，要看 runtime、checkpoint、external storage 或 event log。Day 13 和 Day 16 會分別談 stateful workload 與恢復方式。

![Task 與 Actor 經由 Runtime 落到 Worker 與實際硬體](/posts/ai-infrastructure-day-10/work-abstraction-to-execution-v2.png)

> 圖二：Task 與 Actor 描述的是工作；runtime 會把它們安排到 worker 與實際硬體。

不同 actor runtime 的做法不同。有些會讓同一個 Actor 的 method call 依序處理，避免兩個呼叫同時修改同一份 state；有些則允許 async 或多執行緒並行。啟用並行後，state 不會自動安全，開發者仍得處理 interleaving、lock 與 invariant。重點不是「Actor 等於一條 Thread」，而是它有一份需要持續管理的 state。

## Runtime 如何把工作放到底層？

應用程式提交 Task 或建立 Actor 後，runtime 會選擇合適的 node 與 worker。有些 runtime 會在多台機器上運行許多 worker process，而每個 process 裡又有多條 thread；也有 runtime 直接用 thread pool。

以下是一種常見的承載方式：

```text
Task / Actor
    ↓
Runtime：排程、資源管理、重試策略
    ↓
Worker process
    ↓
Host OS thread：執行 CPU code 或提交 GPU kernel
    ↓
CPU core / GPU device
```

GPU 不是 OS thread 直接執行的下一層；host thread 會提交 kernel，真正的 kernel 再由 GPU 執行。因此，一個 Task 不等於一個 Process；一個 Actor 也不等於一條 Thread。它們描述的是工作模型，底層怎麼承載，要看 runtime。

Ray 是一個例子：呼叫 **.remote()** 時，Ray 會立刻回傳 `ObjectRef`，再把 remote function 排到 worker process 執行；同一個 task worker 可以重複執行許多 Tasks。Actor 則由專用的 Ray worker 承載，該 Actor 的 method 都在同一個 process 執行。[Ray Tasks](https://docs.ray.io/en/latest/ray-core/tasks.html) [Ray Actors](https://docs.ray.io/en/latest/ray-core/actors.html)

## 要用 Task 還是 Actor？

| 情況 | 較自然的選擇 | 原因 |
| --- | --- | --- |
| resize 圖片、parse 文件、計算 embedding | Task | 每筆 input 能獨立處理 |
| 載入模型後持續處理 request | Actor | 避免重複載入模型與初始化 GPU runtime |
| 維護 connection pool、session、mutable cache | Actor | 需要固定的 state owner |
| 大量短工作 | Task，但要注意粒度 | 工作太小時，排程與序列化成本可能超過 compute |

Task 的彈性在於它通常不需要持有跨呼叫的 mutable state。scheduler 因此能把它放到不同 worker，也較容易在失敗後重跑；但若工作會寫入外部系統，仍要確保重跑不會重複造成影響，也就是具備 idempotency。

Actor 的限制也來自 state。state 不能像 stateless Task 那樣隨每次 method call 任意換位置；若要移動，必須 transfer、rehydrate 或重建 state。若要 scale out，通常得思考如何 partition、replicate 或恢復 state。這些複雜度不是 Actor 的缺點，而是 state 本身的成本。

## 小結

Thread 和 Process 處理單機程式如何執行、如何隔離；Task 和 Actor 則讓 runtime 能描述怎麼安排分散式工作。

**工作不需要跨呼叫保留 state，先想 Task；需要長期持有並管理 state，再考慮 Actor。**

下一篇會接著看另一個自然的問題：Task 已經提交了，但結果還沒出來時，程式要怎麼表示「未來才會有的結果」？這就是：**Future 與 Object Reference：非同步運算如何運作？**

## References

- [Python threading](https://docs.python.org/3.13/library/threading.html)
- [Ray Tasks](https://docs.ray.io/en/latest/ray-core/tasks.html)
- [Ray Actors](https://docs.ray.io/en/latest/ray-core/actors.html)
