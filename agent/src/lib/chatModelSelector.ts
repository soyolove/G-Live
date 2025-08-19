/**
 * JiLive 聊天模型选择器
 * 为虚拟主播提供固定的AI配置，不涉及会员体系
 */

import { getAI, type Model, type Platform } from '@/lib/ai/index';
import type { LanguageModel } from 'ai';

/**
 * JiLive的AI场景
 */
export type ChatAIScenario = 'chat' | 'commentary' | 'reaction';

/**
 * JiLive的AI配置
 */
const chatAIConfig = {
  chat: {
    provider: 'google' as Platform,
    model: 'medium' as Model,
    temperature: 0.7,
  },
  commentary: {
    provider: 'google' as Platform,
    model: 'medium' as Model,
    temperature: 0.8,
  },
  reaction: {
    provider: 'google' as Platform,
    model: 'small' as Model,
    temperature: 0.9,
  },
};

/**
 * 获取JiLive的AI模型
 * @param scenario JiLive的使用场景
 * @returns AI模型实例和相关配置
 */
export function getChatAI(scenario: ChatAIScenario): {
  model: LanguageModel;
  temperature: number;
  provider: Platform;
  modelType: Model;
} {
  const config = chatAIConfig[scenario];
  
  if (!config) {
    throw new Error(`Unsupported Chat AI scenario: ${scenario}`);
  }
  
  const model = getAI({
    provider: config.provider,
    inputModel: config.model,
  });
  
  return {
    model,
    temperature: config.temperature,
    provider: config.provider,
    modelType: config.model,
  };
}

/**
 * 获取JiLive的场景配置
 * @param scenario JiLive的使用场景
 * @returns 场景配置
 */
export function getChatScenarioConfig(scenario: ChatAIScenario) {
  const config = chatAIConfig[scenario];
  if (!config) {
    throw new Error(`Unsupported Chat AI scenario: ${scenario}`);
  }
  return { ...config };
}