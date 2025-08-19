/**
 * Investment域AI模型选择器
 * 从Investment域配置读取AI设置，不受会员等级影响
 * Investment域始终使用高性能模型进行分析
 */

import { getAI, type Model, type Platform } from '@/lib/ai';
import { investmentConfig } from '@/config/investment.config';
import type { LanguageModel } from 'ai';

/**
 * Investment域的AI场景
 */
export type InvestmentAIScenario = 'analysis' | 'judge' 

/**
 * 获取Investment域的AI模型
 * @param scenario Investment域的使用场景
 * @returns AI模型实例和相关配置
 */
export function getInvestmentAI(scenario: InvestmentAIScenario): {
  model: LanguageModel;
  temperature: number;
  provider: Platform;
  modelType: Model;
} {
  let config;
  
  switch (scenario) {
    case 'analysis':
      config = investmentConfig.ai.analysisModel;
      break;
    case 'judge':
      config = investmentConfig.ai.judgeModel;
      break;
    default:
      throw new Error(`Unsupported Investment AI scenario: ${scenario}`);
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
 * 获取Investment域的场景配置
 * @param scenario Investment域的使用场景
 * @returns 场景配置
 */
export function getInvestmentScenarioConfig(scenario: InvestmentAIScenario) {
  switch (scenario) {
    case 'analysis':
      return { ...investmentConfig.ai.analysisModel };
    case 'judge':
      return { ...investmentConfig.ai.judgeModel };
    default:
      throw new Error(`Unsupported Investment AI scenario: ${scenario}`);
  }
}