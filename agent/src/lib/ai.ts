import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI, google as googleTools } from "@ai-sdk/google";
import { LanguageModel,wrapLanguageModel,defaultSettingsMiddleware, generateText, tool } from "ai";
import { config } from '../config/index.js';
import { z } from 'zod';


import dotenv from "dotenv";

dotenv.config();

export type Model = "small" | "medium" | "large" | "xlarge" | "reason" | 'vision';
export type Platform = "qwen" | "openai" | "deepseek" | "google";

// AI使用场景
export type AIScenario = 
  | "chat"        // 聊天，强调风格化和语义化
  | "compress"    // 压缩，上下文长，遵从指示
  | "judge"       // 判断，往往是Y/N
  | "analysis"    // 分析，需要高性能和准确
  | "choice";     // 选择，要在一系列选项中选出符合要求的

// 模型映射接口
interface ModelMapping {
  [key: string]: {
    [size in Model]?: string;
  };
}

// 定义各平台的模型映射
const MODEL_MAPPING: ModelMapping = {
  qwen: {
    small: "qwen-turbo",
    medium: "qwen-plus",
    // large: "qwen-max",
    // xlarge: "qwen-max",
    // reason: "qwen-max",
    large:"qwen-max-2025-01-25",
    xlarge: "qwen-max-2025-01-25",
    reason: "qwen-max-2025-01-25",
    vision: "qwen-vl-max-2025-04-08",

  },
  openai: {
    small: "gpt-4o-mini",
    medium: "gpt-4o-mini",
    large: "gpt-4o",
    xlarge: "gpt-4-vision-preview",
    reason: "gpt-o3-mini",
  },
  google:{
    small: 'gemini-2.5-flash',
    medium: 'gemini-2.5-flash',
    large: 'gemini-2.5-pro',
    xlarge: 'gemini-2.5-pro',
    reason: 'gemini-2.5-pro',
    vision: 'gemini-2.5-pro',

  }
  // deepseek: {
  //   small: "deepseek-chat",
  //   medium: "deepseek-chat",
  //   large: "deepseek-chat",
  //   xlarge: "deepseek-chat",
  //   reason: "deepseek-reasoner",
  // },
  // deepseek: {
  //   small: "deepseek-r1-250120",
  //   medium: "deepseek-r1-250120",
  //   large: "deepseek-r1-250120",
  //   xlarge: "deepseek-r1-250120",
  //   reason: "deepseek-r1-250120",
  // },
};

const defaultSelect: Platform = "qwen";
const defaultVersion: Model = "medium";

const openai = createOpenAI({
});

export const qwen = createOpenAI({
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  apiKey: process.env.QWEN_API_KEY,
});



const deepseek = createOpenAI({
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: process.env.HUOSHAN_API_KEY,
});

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  
})

 function getProvider({
  provider = defaultSelect,
}: {
  provider: Platform;
}) {
  switch (provider) {
    case "qwen":
      return qwen;
    case "openai":
      return openai;
    case "deepseek":
      return deepseek;
    case "google":
      return google;

    default:
      return qwen;
  }
}

 function getModel({
  inputModel = defaultVersion,
  provider = defaultSelect,
}: {
  inputModel: Model;
  provider: Platform;
}): string {
  const modelConfig = MODEL_MAPPING[provider];
  if (!modelConfig) {
    throw new Error(`Unsupported platform: ${provider}`);
  }

  const modelName = modelConfig[inputModel];
  if (!modelName) {
    throw new Error(
      `Unsupported model version ${inputModel} for platform ${provider}`
    );
  }

  return modelName;
}


// 场景配置类型
interface ScenarioConfig {
  provider: Platform;
  model: Model;
  temperature: number;
}


// 场景化配置（从config.ts导入）
function getScenarioConfigFromConfig(): Record<AIScenario, ScenarioConfig> {
  return config.ai.scenarios;
}

function getAI({
    inputModel = defaultVersion,
    provider = defaultSelect,
}:{
inputModel: Model;
provider: Platform;     
}):LanguageModel{
    const modelName = getModel({ inputModel, provider });
    const aiProvider = getProvider({ provider })
    
    // 使用 .chat() 方法强制使用 chat/completions API
    // 新版vercel sdk v5的特产，不可不品尝
    if (provider === 'qwen' || provider === 'deepseek') {
        return aiProvider.chat(modelName);
    }
    
    // OpenAI 使用默认的 responses API
    return aiProvider(modelName)
}

// 新增：通过场景获取AI配置
export function getAIByScenario(scenario: AIScenario): { model: LanguageModel; temperature: number; provider: Platform; modelType: Model } {
  const scenarioConfigs = getScenarioConfigFromConfig();
  const config = scenarioConfigs[scenario];
  if (!config) {
    throw new Error(`Unsupported AI scenario: ${scenario}`);
  }
  
  const model = getAI({
    inputModel: config.model,
    provider: config.provider,
  });
  
  return {
    model,
    temperature: config.temperature,
    provider: config.provider,
    modelType: config.model,
  };
}

// 新增：获取场景配置
export function getScenarioConfig(scenario: AIScenario) {
  const scenarioConfigs = getScenarioConfigFromConfig();
  const config = scenarioConfigs[scenario];
  if (!config) {
    throw new Error(`Unsupported AI scenario: ${scenario}`);
  }
  return { ...config };
}

// // 导出prompts配置
// export function getAIPrompts() {
//   return config.ai.prompts;
// }

/**
 * 智能压缩长文本
 * @param content 需要压缩的文本内容
 * @param options 压缩选项
 * @returns 压缩后的文本，如果超过错误阈值则抛出错误
 */
export async function compressContent(
  content: string,
  options?: {
    skipThreshold?: number;
    chunkSize?: number;
    targetLength?: number;
    errorThreshold?: number;
  }
): Promise<string> {
  const {
    skipThreshold = config.ai.compression.skipCompressionThreshold,
    chunkSize = config.ai.compression.chunkSize,
    targetLength = config.ai.compression.targetLength,
    errorThreshold = config.ai.compression.errorThreshold,
  } = options || {};

  // 检查是否超过错误阈值
  if (content.length > errorThreshold) {
    throw new Error(`Content too long: ${content.length} characters exceeds error threshold of ${errorThreshold}`);
  }

  // 小于阈值直接返回
  if (content.length <= skipThreshold) {
    return content;
  }

  console.log(`[AI Compression] Starting compression: ${content.length} characters`);

  // 分段压缩
  const chunks = splitIntoChunks(content, chunkSize);
  console.log(`[AI Compression] Split into ${chunks.length} chunks`);

  // 逐个压缩每个分片
  const compressedChunks: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`[AI Compression] Compressing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    
    try {
      const compressed = await compressChunk(chunk, targetLength);
      compressedChunks.push(compressed);
      console.log(`[AI Compression] Chunk ${i + 1} compressed: ${chunk.length} → ${compressed.length} chars`);
    } catch (error) {
      console.error(`[AI Compression] Failed to compress chunk ${i + 1}:`, error);
      // 压缩失败时使用截断
      compressedChunks.push(chunk.substring(0, targetLength) + '...');
    }
  }

  // 合并压缩后的内容
  let result = compressedChunks.join('\n\n');
  
  // 如果合并后仍然很长，再次压缩
  if (result.length > skipThreshold) {
    console.log(`[AI Compression] Final compression: ${result.length} characters`);
    try {
      result = await compressChunk(result, Math.min(targetLength * 2, skipThreshold));
      console.log(`[AI Compression] Final result: ${result.length} characters`);
    } catch (error) {
      console.error(`[AI Compression] Final compression failed:`, error);
      // 最终压缩失败时使用截断
      result = result.substring(0, skipThreshold) + '...';
    }
  }

  return result;
}

/**
 * 将文本分割成指定大小的块
 */
function splitIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.substring(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 压缩单个文本块
 */
async function compressChunk(chunk: string, targetLength: number): Promise<string> {
  const { model } = getAIByScenario('compress');
  
  const result = await generateText({
    model,
    system: `你是一个专业的文本压缩助手。请将给定的文本压缩到约${targetLength}字符，保留所有关键信息。

压缩要求：
1. 保留所有重要的事实、数据、人名、地名、时间等关键信息
2. 删除冗余的修饰词和重复内容 - 特别注意去除完全重复的句子和段落
3. 使用更简洁的表达方式
4. 保持原文的逻辑结构和核心意思
5. 压缩后的文本应该流畅易读
6. 如果发现大量重复内容，请优先保留最完整的版本

特别处理重复内容：
- 如果同一信息重复出现多次，只保留一次
- 如果是相似但略有不同的内容，合并为一个完整版本
- 重复的列表项、公司名称、数据只保留一份`,
    prompt: `请压缩以下文本到约${targetLength}字符：

${chunk}

请直接返回压缩后的文本，不要添加任何解释或说明。`,
    temperature: 0.2,
  });

  return result.text.trim();
}
