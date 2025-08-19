import type { DataSourceRecord } from '@/investment/types';

// 投资信号分析
export function getSignalAnalysisPrompt(record: DataSourceRecord) {
  const system = `
你是一个专业的投资分析师。请对以下有价值的投资信息进行深度分析，专注于两个核心维度：标的挖掘和择时建议。

分析要求：
1. **标的挖掘**：
   - 识别具体的投资标的（币种、股票、概念等）
   - 评估标的类型和来源，到底为什么值得交易

2. **择时建议**：
   - 分析当前信息是否提示了做多、做空的机会？
   - 当前信息是做用于整个市场的，还是单一资产的？

3. **输出格式**：
   - 语言简洁专业，控制在300字以内
   - 突出重点信息，便于快速理解
   - 需要保留实体名称和数字，确保信息完整性
   `;
  

  const prompt = `请对以下投资信息进行标的挖掘和择时分析：

【数据来源】${record.entityName} (${record.dataSourceType})
【发布时间】${new Date(record.createdAt).toLocaleString('zh-CN')}
【原始内容】${record.content}

请从标的挖掘和择时两个维度进行专业分析：`;

  return { system, prompt };
}

// 投资价值判断
export function getInvestmentValuePrompt(record: DataSourceRecord) {
  const system = `你是一个专业的投资分析师。请严格判断以下信息是否具有实际投资价值。

判断标准（必须严格执行）：
✅ 有价值的信息：
- 潜在的投资标的
- 利好
- 具体的交易策略或时机建议
- 重要的市场数据或事件
- 行业分析或公司动态


❌ 无价值的信息：
- 广告或推广内容
- 无关的市场评论

`;

  const prompt = `请严格按照指定JSON格式判断这条信息是否有投资价值：

实体: ${record.entityName}
类型: ${record.dataSourceType}
内容: ${record.content}

要求返回的JSON格式：
{
  "has_investment_value": true/false,
  "reasons": ["理由1", "理由2", "理由3"]
}

请严格按照上述格式返回JSON结果。`;

  return { system, prompt };
}

// 内容去重分析（多个相似内容）
export function getDuplicationAnalysisPrompt(newContent: string, existingContents: string) {
  const system = `你是一个专业的投资信息分析师。你的任务是分析新内容与已存在内容的关系，并提取有价值的增量信息。

关系类型定义：
1. **identical**: 内容完全相同，只是表述略有不同
2. **new_contains_existing**: 新内容包含了已存在内容的全部信息，并且还有额外信息
3. **existing_contains_new**: 已存在内容包含了新内容的全部信息，新内容没有额外价值
4. **unrelated**: 完全不相关，涉及不同的投资话题或事件
5. **partial_overlap**: 部分重叠，但都包含对方没有的信息

处理规则：
- identical: 跳过新内容，shouldSkip设为true
- new_contains_existing: 提取新内容中除了已存在内容之外的部分，shouldSkip设为false，processedContent包含提取的新部分
- existing_contains_new: 跳过新内容，shouldSkip设为true
- unrelated: 保持新内容原样，shouldSkip设为false
- partial_overlap: 提取新内容中不重叠的部分，shouldSkip设为false，processedContent包含提取的新部分

时效性判断：
- 时效性信息：价格变化、市场动态、突发事件、最新公告等
- 非时效性信息：公司背景、行业分析、长期观点等

重要规则：
1. processedContent只填写提取后的实际内容，不要包含任何分析说明
2. 避免在processedContent中重复相同的内容
3. 对于new_contains_existing和partial_overlap，必须在processedContent中返回提取后的内容
4. reasoning简洁说明判断依据，不超过200字符`;

  const prompt = `分析新内容与已存在内容的关系：

【新内容】
${newContent}

${existingContents}

示例输出（new_contains_existing情况）：
{
  "relationship": "new_contains_existing",
  "shouldSkip": false,
  "processedContent": "Galaxy Digital刚收购8500枚比特币（10亿美元），来自14年老钱包首次套现",
  "isTimeEffective": true,
  "shouldUpdate": false,
  "reasoning": "新内容包含了具体交易细节（8500枚BTC、10亿美元、14年钱包），是独立的新事件"
}`

;

  return { system, prompt };
}