/**
 * AI基础服务层
 * 提供纯粹的AI provider功能，不包含任何业务逻辑
 * 各域应该创建自己的AI选择器来使用这些基础功能
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI, google as googleTools } from "@ai-sdk/google";
import { LanguageModel,wrapLanguageModel,defaultSettingsMiddleware, generateText, tool } from "ai";
import { z } from 'zod';

import dotenv from "dotenv";

dotenv.config();

export type Model = "small" | "medium" | "large" | "xlarge" | "reason" | 'vision';
export type Platform = "qwen" | "openai" | "deepseek" | "google";

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

export function getProvider({
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

export function getModel({
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


/**
 * 获取AI模型实例
 * 这是基础功能，各域应该基于此构建自己的场景选择器
 */
export function getAI({
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

/**
 * 智能压缩长文本
 * 注意：这个函数暂时保留在这里，但未来不同域有必要构建自己的版本
 * @deprecated 将在后续构建telegram和investment不同的lib/aiCompressor.ts
 */
export async function compressContent(
  content: string,
  options?: {
    skipThreshold?: number;
    chunkSize?: number;
    targetLength?: number;
    errorThreshold?: number;
    model: LanguageModel;  // 新增：必须传入模型
    temperature?: number;    // 新增：允许传入温度
  }
): Promise<string> {
  const {
    skipThreshold = 10000,  // 默认值，之前从config读取
    chunkSize = 8000,
    targetLength = 4000,
    errorThreshold = 50000,
    model,
    temperature = 0.2,
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
      const compressed = await compressChunk(chunk, targetLength, model, temperature);
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
      result = await compressChunk(result, Math.min(targetLength * 2, skipThreshold), model, temperature);
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
 * @deprecated 将在后续跟着本体一起构建不同域的版本
 */
async function compressChunk(
  chunk: string, 
  targetLength: number,
  model?: LanguageModel,
  temperature: number = 0.2
): Promise<string> {
  // 如果没有传入模型，使用默认的
  const aiModel = model || getAI({ provider: 'google', inputModel: 'medium' });
  
  const result = await generateText({
    model: aiModel,
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
    temperature,
  });

  return result.text.trim();
}
