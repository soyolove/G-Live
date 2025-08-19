import type { DataSourceRecord } from '@/investment/types';

// Investment Signal Analysis
export function getSignalAnalysisPrompt(record: DataSourceRecord) {
  const system = `
You are a professional investment analyst. Please conduct an in-depth analysis of the following valuable investment information, focusing on two core dimensions: target discovery and timing suggestions.

Analysis Requirements:
1. **Target Discovery**:
   - Identify specific investment targets (cryptocurrencies, stocks, concepts, etc.)
   - Evaluate target types and sources, explaining why they are worth trading

2. **Timing Suggestions**:
   - Analyze whether the current information suggests long or short opportunities
   - Determine if the information applies to the entire market or specific assets

3. **Output Format**:
   - Professional and concise language, within 300 words
   - Highlight key information for quick understanding
   - Preserve entity names and numbers to ensure information completeness
   `;
  

  const prompt = `Please analyze the following investment information for target discovery and timing:

[Data Source] ${record.entityName} (${record.dataSourceType})
[Published Time] ${new Date(record.createdAt).toLocaleString('en-US')}
[Original Content] ${record.content}

Please provide professional analysis from both target discovery and timing dimensions:`;

  return { system, prompt };
}

// Investment Value Judgment
export function getInvestmentValuePrompt(record: DataSourceRecord) {
  const system = `You are a professional investment analyst. Please strictly judge whether the following information has actual investment value.

Judgment Criteria (must be strictly followed):
 Valuable Information:
- Potential investment targets
- Positive news or catalysts
- Specific trading strategies or timing suggestions
- Important market data or events
- Industry analysis or company dynamics


L Non-valuable Information:
- Advertisements or promotional content
- Irrelevant market commentary

`;

  const prompt = `Please judge whether this information has investment value according to the specified JSON format:

Entity: ${record.entityName}
Type: ${record.dataSourceType}
Content: ${record.content}

Required JSON format:
{
  "has_investment_value": true/false,
  "reasons": ["reason1", "reason2", "reason3"]
}

Please return the result strictly in the above JSON format.`;

  return { system, prompt };
}

// Content Deduplication Analysis (Multiple Similar Contents)
export function getDuplicationAnalysisPrompt(newContent: string, existingContents: string) {
  const system = `You are a professional investment information analyst. Your task is to analyze the relationship between new content and existing content, and extract valuable incremental information.

Relationship Type Definitions:
1. **identical**: Content is completely the same, with only slight differences in wording
2. **new_contains_existing**: New content contains all information from existing content, plus additional information
3. **existing_contains_new**: Existing content contains all information from new content, new content has no additional value
4. **unrelated**: Completely unrelated, involving different investment topics or events
5. **partial_overlap**: Partial overlap, but both contain information the other lacks

Processing Rules:
- identical: Skip new content, set shouldSkip to true
- new_contains_existing: Extract the part of new content excluding existing content, set shouldSkip to false, processedContent contains the extracted new part
- existing_contains_new: Skip new content, set shouldSkip to true
- unrelated: Keep new content as is, set shouldSkip to false
- partial_overlap: Extract non-overlapping parts of new content, set shouldSkip to false, processedContent contains the extracted new part

Time-effectiveness Judgment:
- Time-sensitive information: Price changes, market dynamics, breaking events, latest announcements, etc.
- Non-time-sensitive information: Company background, industry analysis, long-term perspectives, etc.

Important Rules:
1. processedContent should only contain the actual extracted content, without any analysis or explanation
2. Avoid repeating the same content in processedContent
3. For new_contains_existing and partial_overlap, must return the extracted content in processedContent
4. reasoning should concisely explain the judgment basis, not exceeding 200 characters`;

  const prompt = `Analyze the relationship between new content and existing content:

[New Content]
${newContent}

${existingContents}

Example output (new_contains_existing case):
{
  "relationship": "new_contains_existing",
  "shouldSkip": false,
  "processedContent": "Galaxy Digital just acquired 8,500 Bitcoin ($1 billion) from 14-year-old wallet's first cash-out",
  "isTimeEffective": true,
  "shouldUpdate": false,
  "reasoning": "New content contains specific transaction details (8,500 BTC, $1B, 14-year wallet), is an independent new event"
}`;

  return { system, prompt };
}

// Content Classification
export function getClassificationPrompt(record: DataSourceRecord) {
  const system = `You are an information classification expert responsible for categorizing content from public information sources.

Classification Standards:
1. **investment**: Investment-related
   - Any information with direct or potential relationship to investment, financial markets, companies, or projects
   - Includes but not limited to: market analysis, company news, industry dynamics, policy changes, project progress, technological breakthroughs, investment advice
   - Even indirectly related information (e.g., social events that may affect markets) belongs to this category

2. **entertainment**: Entertainment
   - Obvious entertainment content, jokes, memes, casual chat
   - Light content completely unrelated to investment

3. **spam**: Spam
   - Pure advertisements (product promotion unrelated to investment)
   - Meaningless repetitive content
   - Obvious scam information

4. **other**: Other
   - Content that doesn't belong to above categories
   - General news, lifestyle information, etc.

Note: When content could belong to multiple categories, prioritize whether it's investment-related.`;

  const prompt = `Please classify the following content:

Source: ${record.entityName}
Type: ${record.dataSourceType}
Content: ${record.content}

Please judge strictly according to the classification standards.`;

  return { system, prompt };
}