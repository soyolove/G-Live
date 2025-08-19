import { Agent } from '@alice/wond-v3';
import { createDataSourcePump } from './controllers/DataSourcePump';
import { createDataSourceClassifierReactor } from './controllers/DataSourceClassifierReactor';
import { createDataSourceDeduplicationReactor } from './controllers/DataSourceDeduplicationReactor';
import { createDataSourceSignalReactor } from './controllers/DataSourceSignalReactor';
import { DataSourceManager } from './lib/subscriber/dataSourceManager';
import { setAvailableEntities } from './lib/subscriber/entityManager';
import type { InvestmentConfig } from '@/config/investment.config';
import { getEnabledSubscriptions } from '@/config/subscribeConfig';
import type { InvestmentHandler } from './handler';

interface InvestmentIntegrationOptions {
  baseUrl: string;
  apiKey?: string;
  debug?: boolean;
  redisUrl?: string;
  investmentConfig: InvestmentConfig;
  investmentHandler?: InvestmentHandler;  // 可选的handler，用于测试环境
  enableTracking?: boolean;  // 是否启用追踪
}

export async function addInvestmentIntegration(agent: Agent, options: InvestmentIntegrationOptions) {
  console.log('[Investment Integration] 初始化增强版投资集成...');

  // 创建数据源管理器
  const dataSourceManager = new DataSourceManager({
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    debug: options.debug,
    redisUrl: options.redisUrl,
    datasourceConfig: options.investmentConfig.datasource,
  });

  // 创建核心controllers
  const { pump, pumpRecord } = createDataSourcePump();
  const classifierReactor = createDataSourceClassifierReactor(
    options.investmentConfig.datasource,
    options.investmentHandler,
    options.enableTracking
  );
  const deduplicationReactor = createDataSourceDeduplicationReactor(
    options.investmentConfig.datasource,
    options.investmentHandler,
    options.enableTracking
  );
  const signalReactor = createDataSourceSignalReactor(
    options.investmentConfig.datasource,
    options.investmentHandler,
    options.enableTracking
  );
  
  // 添加controllers（按数据流顺序）
  agent.addController(pump);
  agent.addController(classifierReactor);
  agent.addController(deduplicationReactor);
  agent.addController(signalReactor);
  
  console.log('[DataSource Integration] 核心流程已加载（Pump → Classifier → Deduplication → Signal）');

  // 启动数据源订阅
  const startDataSourceSubscriptions = async () => {
    try {
      console.log('[DataSource Integration] 启动数据源订阅...');
      
      // 初始化管理器
      await dataSourceManager.initialize();
      
      // 获取启用的订阅配置
      const enabledSubscriptions = getEnabledSubscriptions();
      console.log(`[DataSource Integration] 配置中启用了 ${enabledSubscriptions.length} 个订阅`);
      
      if (enabledSubscriptions.length === 0) {
        console.warn('[DataSource Integration] ⚠️ 没有启用任何数据源订阅，请检查 config/subscribeConfig.ts');
        return;
      }
      
      // 设置可用实体
      const availableEntities = dataSourceManager.getAvailableEntities();
      setAvailableEntities(availableEntities);
      console.log(`[DataSource Integration] 平台上有 ${availableEntities.length} 个可用实体`);
      
      // 只订阅配置中启用的实体
      const subscribedEntities: string[] = [];
      for (const subscription of enabledSubscriptions) {
        const entity = availableEntities.find(e => e.entityId === subscription.entityId);
        if (entity) {
          console.log(`[DataSource Integration] 订阅: ${entity.displayName} (${entity.entityId})`);
          dataSourceManager.startSubscription(entity.entityId, (record) => {
            // 通过pump泵入Event Pool
            const timestamp = new Date().toLocaleTimeString('zh-CN');
            console.log(`[${timestamp}] [DataSource Pump] 泵入记录 ${record.id.slice(0, 8)}... 来自 ${entity.displayName} (时间: ${new Date(record.createdAt).toLocaleString('zh-CN')})`);
            
            pumpRecord({
              recordId: record.id,
              entityId: record.entityId,
              entityName: entity.displayName || entity.entityId,
              dataSourceType: (entity.dataType?.trim() as 'info' | 'strategy') || 'info',
              content: record.data.content,
              metadata: record.metadata,
              createdAt: record.createdAt,
            });
          });
          subscribedEntities.push(entity.entityId);
        } else {
          console.warn(`[DataSource Integration] ⚠️ 配置中的实体 ${subscription.entityId} 在平台上不存在`);
        }
      }
      
      console.log(`[DataSource Integration] ✅ 成功订阅 ${subscribedEntities.length} 个数据源`);
      
      // 显示更新后的系统架构
      console.log('\n=== 数据处理架构 ===');
      console.log('1. DataSourcePump → 接收原始数据');
      console.log('2. DataSourceClassifierReactor → 分类（investment/entertainment/spam/other）');
      console.log('3. DataSourceDeduplicationReactor → 去重处理（只处理investment类型）');
      console.log('4. DataSourceSignalReactor → 生成投资信号');
      console.log('   输出: DataSourceSignalGenerated');
      console.log('5. 下游: Telegram域的SignalDistributionReactor分发信号');
      console.log('========================\n');
      
      console.log('[DataSource Integration] 数据源集成启动完成');
      
    } catch (error) {
      console.error('[DataSource Integration] 启动失败:', error);
    }
  };

  // 停止数据源订阅
  const stopDataSourceSubscriptions = () => {
    dataSourceManager.stopAllSubscriptions();
    console.log('[DataSource Integration] 数据源订阅已停止');
  };

  // 获取数据源状态
  const getDataSourceStatus = () => {
    return dataSourceManager.getStatus();
  };

  return {
    manager: dataSourceManager,
    startDataSourceSubscriptions,
    stopDataSourceSubscriptions,
    getDataSourceStatus,
    pumpRecord,  // 导出pumpRecord供测试使用
  };
}