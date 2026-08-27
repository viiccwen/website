---
title: "模型之外：Future 與 Object Reference：非同步運算如何運作？"
published: 2026-08-27
image: "/posts/ai-infrastructure-day-11/future-submit-wait.png"
tags: ["AI Infra", "鐵人賽"]
category: "AI infra"
draft: false
lang: "zh-tw"
---

上一篇我們談到 task：一份工作可以先交給 runtime，再由 scheduler 找到合適的 worker 執行。但這馬上產生一個問題：**task 交出去的那一刻，工作通常還沒有完成，那呼叫端到底拿到什麼？**

假設一個函式需要五秒才能完成。一般同步程式會直接等待：

```python
result = expensive_computation()
print(result)
```

只有 `expensive_computation()` 真正算完之後，`result` 才會出現，程式才能繼續往下跑。如果一次只有一份工作，這完全合理；但如果現在有十份彼此獨立的工作，每次都「提交一份、等五秒、拿結果、再提交下一份」，就會浪費大量可以平行執行的機會。

非同步執行需要另一種做法。task 交出去後，程式先拿一個「**之後可以領結果的憑證**」，真正的工作則由其他 thread、process，甚至另一台 machine 上的 worker 執行。呼叫端不用馬上等它，而可以繼續提交其他工作，直到真的需要結果時才等待。

這就是 **Future** 要解決的核心問題。

到了 distributed runtime，事情又多一層：結果即使已經算完，也不代表資料就在目前這台 machine 的 memory 裡。因此除了「結果好了沒」，系統還需要一種方式表示「我正在引用哪一份 distributed object」。這是另一個需要分開理解的概念：**Object Reference**。

## Future

Python 標準函式庫的 `concurrent.futures` 提供了一個很乾淨的 Future 例子。`Executor.submit()` 會排程一個 Callable 非同步執行，並立即回傳一個 `Future`；真正需要結果時，再透過 `Future.result()` 取得。如果工作尚未完成，這時才會等待。

例如下面：

```python
from concurrent.futures import ThreadPoolExecutor
import time


def slow_square(x):
    time.sleep(2)
    return x * x


with ThreadPoolExecutor(max_workers=3) as executor:
    future_a = executor.submit(slow_square, 2)
    future_b = executor.submit(slow_square, 3)
    future_c = executor.submit(slow_square, 4)

    print("Tasks submitted")

    print(future_a.result())
    print(future_b.result())
    print(future_c.result())
```

關鍵不是 `ThreadPoolExecutor` 本身，而是程式的控制流程。前三次 `submit()` 很快就會回傳，因此三份工作有機會同時被不同 worker 執行。`future_a` 此時不是數字 `4`，而是一個代表「這次執行最終結果」的物件。

這個範例用 `sleep()` 模擬 I/O 等待重疊。若工作主要執行 Python 的 CPU-bound 程式碼，預設 CPython 會受 GIL 影響；這時 `ProcessPoolExecutor` 往往是更合適的選擇。

可以把它理解成：`submit(task) → Future`，稍後才是：`Future → result() → value`，因此 Future 最核心的語意就是：**真正的 value 還沒準備好，但我已經有一個 handle 可以代表這次運算。**

這個抽象讓應用程式不必知道工作落在哪個 process 或 thread。Python 的 `concurrent.futures` 甚至讓 `ThreadPoolExecutor`、`ProcessPoolExecutor` 等不同 execution backend 共用相似的 Future 介面。也就是說，應用程式關心的是「工作完成了嗎、結果是多少」，而不是底層的實際承載方式。

這也是 distributed runtime 一直在做的事情：把**抽象工作**和**實際執行**分開。

![同步呼叫依序等待；Future 則將 task 提交與結果取得分開](/posts/ai-infrastructure-day-11/future-submit-wait.png)

> 圖一：Future 將 task 提交與結果取得拆開，因此呼叫端不必在每份工作提交後立刻停下來等待。

## Object Reference

Future 主要解決的是「結果還沒有完成」的問題。但到了 distributed runtime，還有另一個問題：**結果即使已經完成，也可能不在 caller 所在的 machine。**

假設 driver 在 node A 提交 task，而 task 實際跑在 node B，最直覺的設計是 task 一完成，就立刻把 2 GB result 傳回 driver。但如果 driver 根本不需要直接讀這 2 GB 呢？

假設下一個 task 也需要這份 result，而且它其實可以直接在 node B 執行。如果第一次完成後先把 2 GB 從 B 傳到 A，接著下游 task 又被排回 B，就產生完全沒有必要的來回搬運。

更好的方法是讓應用程式先拿一個 **Object Reference**。它代表「我正在引用某個 distributed object」，但並不代表 object 的完整內容已經被 materialize 到目前 process。

因此可以先把三個概念分開：

| 概念               | 主要回答的問題                     |
| ---------------- | --------------------------- |
| Future           | 這次 computation 的結果完成了嗎？     |
| Object Reference | 我正在引用哪個 distributed object？ |
| value            | 真正的資料內容是什麼？                 |

這裡特別不能把 Object Reference 解釋成「Future 再加上一個 location」。實際物件可能存在一個或多個副本，位置也可能因資料傳輸、重建或其他 runtime 行為而改變。**location 是 runtime 維護的內部資訊，不是 reference 對應用程式暴露的核心語意。**

Object Reference 也不是 remote pointer。普通 pointer 指向某個 process virtual address space 中的 memory address，另一台 machine 上完全不能直接使用。Object Reference 比較像由 runtime 管理的 logical identity；runtime 可以根據這個 identity 追蹤 object 是否 ready、是否需要取得底層資料，以及後續 consumer 執行時是否真的需要產生 network transfer。

Ray 的 `ObjectRef` 就是一個具體例子。Ray 的 remote object 可以由 task return value 產生，也可以直接使用 `ray.put()` 把既有 Python value 存入 object store，再取得對應的 `ObjectRef`。因此 `ObjectRef` 不一定代表「某個還在等待計算的 Future」；它也可能引用一份早就已經存在的 object。

這也是為什麼比較好的理解是：

> **Future 強調 completion；Object Reference 強調 object identity。**

某些 distributed runtime 的 reference 可以同時具有 future-like 的 completion semantics，但兩個概念不必硬畫成包含關係。

![將資料拉回 driver 會造成兩次搬運；傳遞 Object Reference 可讓 runtime 依 placement 決定是否搬資料](/posts/ai-infrastructure-day-11/object-reference-data-movement.png)

> 圖二：Object Reference 讓應用程式可以先引用 distributed object，而不必為了經過 driver 就立即把完整資料拉回本機。

資料就緒和資料在本地仍是兩件事。object X 即使已經 ready，task B 若被排到沒有 X 的 node，runtime 仍要先搬資料；reference 的建立不會把資料自動 broadcast 到所有 nodes。這也把 Day 08 的 data locality 和今天的 Object Reference 接了起來。

---

## Ray 如何讓 reference 形成 task dependency

Future 和 dependency 要分開看。「把未完成結果直接交給下游工作」並不是所有 Future API 都支援的通用語意。Python 的 `concurrent.futures` 不會因為你把一個 `Future` 當普通 argument 傳入另一個 `submit()`，就自動把它解讀成「請等前一個結果完成後，把真正 value 傳給下一份工作」。

Ray 則明確支援這種 dependency model。

先看一個簡單例子：

```python
import ray


@ray.remote
def create_value():
    return 10


@ray.remote
def add_one(value):
    return value + 1


value_ref = create_value.remote()
result_ref = add_one.remote(value_ref)

print(ray.get(result_ref))
```

第一行：

```python
value_ref = create_value.remote()
```

會提交第一個 remote task，並立即取得一個 `ObjectRef`。

接下來：

```python
result_ref = add_one.remote(value_ref)
```

我們沒有先：

```python
value = ray.get(value_ref)
```

再把真正的 `10` 傳進 `add_one()`。

而是直接把 `ObjectRef` 當成第二個 remote task 的 **top-level argument**。

Ray 對這個案例有明確語意：當 `ObjectRef` 直接作為 task 的 top-level argument 時，runtime 會在 task 執行前 dereference 它。也就是第二個 task 會等待第一個 object 的底層資料 ready；進入 `add_one()` function body 時，`value` 已經是實際的 `10`，而不是 `ObjectRef`。

因此 runtime 可以知道：

`create_value → add_one`

之間存在資料依賴。

Ray 官方 task 文件也明確說明，當第二個 task 使用第一個 task 的 `ObjectRef` 作為 argument 時，第二個 task 不會在第一個 task 完成前執行；如果兩個 task 最後被排到不同 machine，第一個 task 的 output 才會經 network 傳到第二個 task 所在 machine。

這裡有三件事情值得分開看。

第一，driver 不需要先 `ray.get()`。它可以在真正 value 尚未回到 driver 時，就先描述下一步工作。

第二，**producer 與 consumer task 之間的資料依賴才是 graph 裡真正的 edge**。`ObjectRef` 是 runtime 用來表達與追蹤這條 dependency 的 handle，而不是「Future 本身就是 DAG edge」。

第三，reference 被傳給下游 task，不等於底層 data 同時跟著 reference 一起經過 driver。真正的資料搬移發生在 runtime 判斷 consumer 所在位置需要這份資料時。

這是 distributed runtime 相比普通同步 function call 很重要的一步。driver 從「每一步都親自拿結果、再提交下一步」變成只需要描述：

> task B 需要 task A 的 result。

至於 A 在哪裡執行、B 何時 ready、資料是否需要跨 machine 傳送，交給 runtime 處理。

Object 回收、reference counting 與 object store 的 memory 壓力，會留到 Day 14、Day 15。這篇先記住三件事：

1. **Future 讓工作提交後，不必立即等待真正結果。**
2. **Object Reference 讓 distributed application 可以引用資料，而不代表資料已經回到本機。**
3. **某些 runtime，例如 Ray，可以直接利用 `ObjectRef` 表達 task dependency，讓 driver 不必先取得 value 才能提交下游工作。**

現在 runtime 已經知道：

```text
Task A produces X
Task B needs X
Task C is independent
```

也知道某些 input object 可能已經存在不同 machines。

接下來要處理的是：A、B、C 誰先跑？哪個 worker 有足夠的 CPU 或 GPU？若資料在 node A、node B 較空，task 又該放在哪裡？這些都不是 Future 或 Object Reference 負責決定的，它們只是把 **dependency 與 data identity** 告訴 runtime，真正決定工作何時、在哪裡執行的，是下一個元件：**scheduler。**

下一篇：**Task Scheduling：誰決定工作跑在哪台機器？**

## References

* [Python Documentation — `concurrent.futures`](https://docs.python.org/3/library/concurrent.futures.html)
* [Python Documentation — `threading`](https://docs.python.org/3/library/threading.html)
* [Ray Documentation — Tasks](https://docs.ray.io/en/latest/ray-core/tasks.html)
* [Ray Documentation — Objects](https://docs.ray.io/en/latest/ray-core/objects.html)
