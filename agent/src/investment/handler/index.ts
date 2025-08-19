// 导出类和类型
export { InvestmentHandler } from './InvestmentHandler';
export type { ControllerTrackingData, FlowData, InvestmentHandlerConfig } from './InvestmentHandler';

// 工具函数
import { InvestmentHandler } from './InvestmentHandler';
export const generateControllerId = InvestmentHandler.generateControllerId;
export const generateFlowId = InvestmentHandler.generateFlowId;