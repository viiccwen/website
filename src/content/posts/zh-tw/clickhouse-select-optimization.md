---
title: ClickHouse 系列：查詢優化案例
published: 2025-08-28
image: 'https://images.prismic.io/contrary-research/ZiwDyN3JpQ5PTNpR_clickhousecover.png?auto=format,compress'
tags: [ClickHouse, Database, 鐵人賽]
category: 'software development'
draft: false 
lang: ''
---

在前幾篇文章中，我們已經介紹過 ClickHouse 的基礎架構、MergeTree 儲存引擎，以及各種索引與資料壓縮機制。這些特性讓 ClickHouse 成為一個極具效能的 OLAP（線上分析處理）資料庫，特別適合處理大規模資料查詢。

然而，在實際專案中，我們會發現「效能並非理所當然」。同樣一張表、同樣一筆數據，如果查詢設計不當，效能可能差到百倍以上。

## 為什麼需要查詢優化？

ClickHouse 的確擅長處理數十億筆資料，但這並不代表我們可以「無腦查詢」。隨著資料量從 **100 萬 → 1000 萬 → 1 億** 成長，若沒有妥善設計，查詢速度可能會從毫秒級惡化成數秒甚至數十秒，直接影響使用者體驗。

舉例來說：

* Dashboard 無法即時更新，導致決策延遲
* API 響應超過數秒，造成前端操作卡頓
* Backend, Data Scientist 無法在合適時間內完成查詢分析

因此，**查詢優化不只是為了「快」，更是為了系統的穩定性與可擴展性**。

## OFFSET 分頁效能差

在許多系統中，最常見的需求就是「分頁查詢」。假設我們有一個 `events` 表，用來紀錄使用者的行為事件：

```sql
SELECT * FROM events 
ORDER BY created_at DESC 
LIMIT 50 OFFSET 1000000;
```

這個查詢看似正常，但隨著 OFFSET 變大，效能會急速下降。原因在於 ClickHouse 需要掃描並丟棄前面一百萬筆資料，才能回傳第 1000001 筆到 1000050 筆。

### 優化方案：Keyset Pagination（游標分頁）

改用「基於主鍵或排序欄位的分頁」：

```sql
SELECT * FROM events 
WHERE created_at < '2025-01-01 00:00:00'
ORDER BY created_at DESC
LIMIT 50;
```

這種方式直接從指定時間點往後查詢，不需要丟棄前面的資料，效能大幅提升。

* **優化前**：數秒到數十秒
* **優化後**：數百毫秒甚至更快

這種方法在時間序列資料中特別有效，也符合 ClickHouse 的設計哲學：**盡量掃描少量資料，而非掃描所有資料再過濾**。

## WHERE 條件未使用索引

另一個常見問題是「查詢條件沒有命中索引」。假設我們要查詢某個使用者最近 7 天的紀錄：

```sql
SELECT COUNT(*) 
FROM logs 
WHERE user_id = 123 
AND created_at >= today() - 7;
```

如果表的排序鍵不是 `(user_id, created_at)`，這個查詢就會全表掃描，效能極差。

### 優化方案：Primary Key + Partition

在建表時，我們應該考慮查詢模式，將常用的過濾條件設定為排序鍵或分區：

```sql
CREATE TABLE logs
(
    user_id UInt64,
    created_at DateTime,
    event_type String,
    ...
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (user_id, created_at);
```

這樣，當我們查詢某個 `user_id` 並限制時間區間時，ClickHouse 會自動進行 **Partition Pruning**，只掃描必要的資料。

* **優化前**：掃描數億筆資料
* **優化後**：僅掃描數百萬筆資料，速度提升 10 倍以上

## 重複資料導致彙總變慢

在實務上，我們常會遇到「批次匯入導致重複資料」的情境。例如，某些 ETL 程序每天匯入一份全量資料，但會包含重複紀錄。

原始查詢需要先 `GROUP BY` 去重，這對數億筆資料來說效能極差。

### 優化方案 1：ReplacingMergeTree 去重

使用 `ReplacingMergeTree`，在合併階段自動去除重複紀錄：

```sql
CREATE TABLE events
(
    id UInt64,
    user_id UInt64,
    event_type String,
    version UInt32
)
ENGINE = ReplacingMergeTree(version)
ORDER BY (id);
```

這樣，查詢時就不需要再額外去重，效能大幅提升，這是我在實習過程中親身經歷的QQ，直接重建一張 table，把資料轉移到 `ReplacingMergeTree`的 new table 上。

### 優化方案 2：Materialized View 預聚合

另一個作法是建立 **MV (Materialized View)**，將原始資料預先彙總存入新表：

```sql
CREATE MATERIALIZED VIEW events_mv 
ENGINE = SummingMergeTree()
ORDER BY (user_id, event_type)
AS
SELECT user_id, event_type, count() AS cnt
FROM events
GROUP BY user_id, event_type;
```

查詢時只需要對 `events_mv` 做 SELECT，效能幾乎是秒殺級。

## JOIN 效能不佳

ClickHouse 的 JOIN 並不像**傳統關聯式資料庫那樣靈活**，若不小心，效能會很差。

假設我們要將 `events` 表與 `users` 表做關聯：

```sql
SELECT e.*, u.name 
FROM events e
JOIN users u ON e.user_id = u.id;
```

若 `users` 是一張大表，JOIN 效能會急速下降。

### 優化方案：Dictionary 加速

如果 `users` 是一張小表，可以轉成 **Dictionary**，放到記憶體中供查詢使用：

```sql
CREATE DICTIONARY users_dict
(
    id UInt64,
    name String
)
PRIMARY KEY id
SOURCE(CLICKHOUSE(TABLE users))
LAYOUT(HASHED());
```

查詢時就可以改寫成：

```sql
SELECT e.*, dictGet('users_dict', 'name', toUInt64(e.user_id)) AS user_name
FROM events e;
```

這種方式等於把 `users` 變成一個高效快取，避免大表 JOIN。

* **優化前**：JOIN 查詢數秒甚至數十秒
* **優化後**：查詢僅需數百毫秒

> 想學習 Dictionary 可參考 [官方文件](https://clickhouse.com/docs/dictionary#:~:text=A%20dictionary%20in%20ClickHouse%20provides%20an%20in-memory%20key-value,external%20sources%2C%20optimizing%20for%20super-low%20latency%20lookup%20queries.)， Dictionary 是一個專門給小表作為 cache 的特殊型別，讓你在高頻查詢中，避免每次都去 JOIN 大表，改用 快取好的 Key-Value 對應 來加速查詢時間。


## 總結

從這些案例可以看到，ClickHouse 的查詢效能優化大致遵循以下原則：

1. **避免 OFFSET，改用 Keyset 分頁**
2. **設計良好的排序鍵與分區**，讓查詢能命中索引
3. **使用 MergeTree 變種 (Replacing / Summing)** 來處理去重與聚合
4. **善用 Materialized View** 預先計算，避免重複運算
5. **JOIN 最小化**：小表 JOIN 可以轉成 Dictionary，大表 JOIN 需慎用
6. **盡量減少需要掃描的資料量**，而不是「事後再過濾」

透過查詢優化，我們能將原本數秒甚至數十秒的查詢縮短到毫秒級，這對即時分析、線上系統效能都有關鍵意義。

希望這些案例能幫助大家在實務中更好地駕馭 ClickHouse！ 🚀


#### ClickHouse 系列持續更新中:
1. [ClickHouse 系列：ClickHouse 是什麼？與傳統 OLAP/OLTP 資料庫的差異](https://blog.vicwen.app/posts/what-is-clickhouse/)
2. [ClickHouse 系列：ClickHouse 為什麼選擇 Column-based 儲存？講解 Row-based 與 Column-based 的核心差異](https://blog.vicwen.app/posts/clickhouse-column-row-based-storage/)
3. [ClickHouse 系列：ClickHouse 儲存引擎 - MergeTree](https://blog.vicwen.app/posts/clickhouse-mergetree-engine)
4. [ClickHouse 系列：壓縮技術與 Data Skipping Indexes 如何大幅加速查詢](https://blog.vicwen.app/posts/clickhouse-compression-skipping-index/)
5. [ClickHouse 系列：ReplacingMergeTree 與資料去重機制](https://blog.vicwen.app/posts/clickhouse-replacingmergetree-deduplication/)
6. [ClickHouse 系列：SummingMergeTree 進行資料彙總的應用場景](https://blog.vicwen.app/posts/clickhouse-summingmergetree-aggregation/)
7. [ClickHouse 系列：Materialized Views 即時聚合查詢](https://blog.vicwen.app/posts/clickhouse-materialized-view/)
8. [ClickHouse 系列：分區策略與 Partition Pruning 原理解析](https://blog.vicwen.app/posts/clickhouse-partition-pruning/)
9. [ClickHouse 系列：Primary Key、Sorting Key 與 Granule 索引運作原理](https://blog.vicwen.app/posts/clickhouse-primary-sorting-key/)
10. [ClickHouse 系列：CollapsingMergeTree 與邏輯刪除的最佳實踐](https://blog.vicwen.app/posts/clickhouse-collapsingmergetree/)
11. [ClickHouse 系列：VersionedCollapsingMergeTree 版本控制與資料衝突解決](https://blog.vicwen.app/posts/clickhouse-versioned-collapsingmergetree/)
12. [ClickHouse 系列：AggregatingMergeTree 實時指標統計的進階應用](https://blog.vicwen.app/posts/clickhouse-aggregatingmergetree/)
13. [ClickHouse 系列：Distributed Table 與分布式查詢架構](https://blog.vicwen.app/posts/clickhouse-distributed-table-architecture/)
14. [ClickHouse 系列：Replicated Tables 高可用性與零停機升級實作](https://blog.vicwen.app/posts/clickhouse-replication-failover/)
15. [ClickHouse 系列：與 Kafka 整合打造即時 Data Streaming Pipeline](https://blog.vicwen.app/posts/clickhouse-kafka-data-streaming-pipeline/)
16. [ClickHouse 系列：批次匯入最佳實踐 (CSV、Parquet、Native Format)](https://blog.vicwen.app/posts/clickhouse-batch-import/)
17. [ClickHouse 系列：ClickHouse 與外部資料源整合（PostgreSQL）](https://blog.vicwen.app/posts/clickhouse-external-data-integration/)
18. [ClickHouse 系列：如何提升查詢優化？system.query_log 與 EXPLAIN 用法](https://blog.vicwen.app/posts/clickhouse-query-log-explain/)
19. [ClickHouse 系列：Projections 進階查詢加速技術](https://blog.vicwen.app/posts/clickhouse-projections-optimization/)
20. [ClickHouse 系列：Sampling 抽樣查詢與統計技術原理](https://blog.vicwen.app/posts/clickhouse-sampling-statistics/)
21. [ClickHouse 系列：TTL 資料清理與儲存成本優化](https://blog.vicwen.app/posts/clickhouse-ttl-storage-management/)
22. [ClickHouse 系列：儲存政策（Storage Policies）與磁碟資源分層策略](https://blog.vicwen.app/posts/clickhouse-storage-policies/)
23. [ClickHouse 系列：表格設計與儲存優化細節](https://blog.vicwen.app/posts/clickhouse-schemas-storage-improvement/)
24. [ClickHouse 系列：ClickHouse 系列：整合 Grafana 打造可視化監控](https://blog.vicwen.app/posts/clickhouse-grafana-dashboard/)
25. [ClickHouse 系列：查詢優化案例](https://blog.vicwen.app/posts/clickhouse-select-optimization/)
26. [ClickHouse 系列：與 BI 工具整合（Power BI）](https://blog.vicwen.app/posts/clickhouse-bi-integration/)
27. [ClickHouse 系列：ClickHouse Cloud 與自建部署的優劣比較](https://blog.vicwen.app/posts/clickhouse-cloud-vs-self-host/)
28. [ClickHouse 系列：資料庫安全性與權限管理（RBAC）實作](https://blog.vicwen.app/posts/clickhouse-security-rbac/)
29. [ClickHouse 系列：Kubernetes 部署分散式架構](https://blog.vicwen.app/posts/clickhouse-operator-kubernates/)
30. [ClickHouse 系列：從原始碼看 MergeTree 的六大核心機制](https://blog.vicwen.app/posts/clickhouse-mergetree-sourcecode-introduction/)