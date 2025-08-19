# Investment Controllers 功能区分

## 现有Controller

### DataSourcePump
- **职责**：从DataSource API把拿到的信息泵入agent的感知范围
- **输入**：定时触发
- **输出**：DATA_SOURCE_RECORD_RECEIVED事件
- **功能**：定时从API获取新记录，发送到事件池

### DataSourceFilterReactor（需要拆分）
当前这个Controller承担了太多职责，需要拆分成两个：

## 重构后的Controller设计

### DataSourceClassifierReactor（分类器）
- **职责**：对信息源进行分类
- **输入**：DATA_SOURCE_RECORD_RECEIVED
- **输出**：DATA_SOURCE_RECORD_CLASSIFIED（新事件）
- **功能**：
  - 调用AI对信息进行分类
  - 分类类型：
    - `investment`：任何有直接或潜在投资价值相关信息（行业新闻、公司新闻、项目进度、投资建议等）
    - `entertainment`：娱乐/乐子（段子、梗图、闲聊等）

    - `spam`：垃圾信息（纯粹的广告、无意义内容等）
    - `other`：其他类型
  - 只传递有价值的分类（如investment）到下游
  - 为不同类型信息预留扩展点

### DataSourceDeduplicationReactor（去重持久化器）
- **职责**：去重和向量存储
- **输入**：DATA_SOURCE_RECORD_CLASSIFIED
- **输出**：DATA_SOURCE_SIGNAL_GENERATED
- **功能**：
  - 向量相似度计算
  - 五种关系判断（identical、new_contains_existing、existing_contains_new、unrelated、partial_overlap）
  - 时效性信息的更新处理
  - 向量存储的保存和更新
  - 生成最终的投资信号

## 数据流

```
DataSourcePump 
    ↓
DATA_SOURCE_RECORD_RECEIVED
    ↓
DataSourceClassifierReactor（价值判断）
    ↓
【event】DATA_SOURCE_RECORD_CLASSIFIED（有价值的记录）
    ↓
DataSourceDeduplicationReactor（去重+持久化）
    ↓
【event】DATA_SOURCE_SIGNAL_GENERATED（最终信号）
```

## 拆分的好处

1. **单一职责**：每个Controller只做一件事
2. **可测试性**：可以单独测试分类逻辑和去重逻辑
3. **可观察性**：能看到有多少记录被分类为有价值，有多少被去重
4. **灵活性**：可以在中间插入其他处理步骤（比如标的提取）
5. **性能优化**：无价值的记录不会进入昂贵的向量计算

## 后续可能增加的Controller

- **DataSourceEnricherReactor**：信息增强（提取标的、关键词等）
- **DataSourceAggregatorIterator**：信息聚合（相关信息合并）
- **DataSourceScoringReactor**：重要度评分
- **DataSourceReportIterator**：定时报告生成