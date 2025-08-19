/**
 * Investment域配置
 * 纯粹的投资分析配置，不包含任何用户交互或推送逻辑
 */

export interface InvestmentConfig {
  // DataSource 数据源配置
  datasource: {
    /**
     * 数据源API基础URL
     * 用于连接投资数据提供商的API端点
     */
    baseUrl: string;
    
    /**
     * API访问密钥
     * 用于身份验证的API key
     */
    apiKey: string;
    
    /**
     * 调试模式开关
     * 开启后会输出详细的调试日志
     */
    debug: boolean;
    
    /**
     * 是否禁用时间戳缓存
     * - false: 使用Redis缓存上次拉取时间戳，避免重复处理
     * - true: 每次重启都重新拉取所有数据（用于测试）
     */
    disableTimestampCache: boolean;
    
    /**
     * 批量分析间隔（毫秒）
     * 收集多长时间的数据记录后，批量进行一次AI分析
     * 建议：3-10分钟，平衡信息时效性和完整性
     */
    batchInterval: number;
    
    /**
     * 数据源轮询间隔（毫秒）
     * 每个数据源实体的API轮询频率
     * 注意：需要考虑API速率限制，避免429错误
     */
    subscriptionInterval: number;
    
    /**
     * 订阅启动延迟（毫秒）
     * 启动多个实体订阅时，每个实体之间的延迟
     * 用于：避免同时发起大量请求触发API速率限制
     */
    subscriptionStartDelay: number;
    
    /**
     * 报告生成间隔（毫秒）
     * 定期生成投资报告的时间间隔（旧版兼容）
     * 建议使用 reports 中的细分配置
     */
    reportInterval: number;
    
    // 报告生成配置
    reports: {
      /**
       * 投资标的报告配置
       * 定期生成包含高价值投资标的的综合报告
       */
      investment: {
        /**
         * Timer触发间隔（分钟）
         * Timer多久检查一次是否需要生成报告
         */
        timerIntervalMinutes: number;
        
        /**
         * 报告生成间隔（分钟）
         * 实际多久生成一次投资标的报告
         */
        reportIntervalMinutes: number;
        
        /**
         * 每次报告包含的标的数量上限
         * 控制报告长度，避免信息过载
         */
        targetLimit: number;
      };
      
      /**
       * 择时信号报告配置
       * 分析市场时机，提供买入/卖出时机建议
       */
      timing: {
        /**
         * Timer触发间隔（分钟）
         * Timer多久检查一次是否需要生成择时报告
         */
        timerIntervalMinutes: number;
        
        /**
         * 报告生成间隔（分钟）
         * 实际多久生成一次择时信号报告
         */
        reportIntervalMinutes: number;
        
        /**
         * 信号分析时间窗口（分钟）
         * 分析最近多长时间内的市场信号
         * 默认1440分钟（24小时）进行全天分析
         */
        signalWindowMinutes: number;
      };
    };
  };
  
  /**
   * Investment域专用AI配置
   * Investment域始终使用高性能模型，不受会员等级影响
   */
  ai: {
    /**
     * 数据分析模型
     * 用于分析原始投资数据，提取投资价值
     */
    analysisModel: {
      provider: 'google' | 'qwen' | 'openai';
      model: 'small' | 'medium' | 'large';
      temperature: number; // 0.0-1.0，越低越稳定
    };
    
    /**
     * 价值判断模型
     * 用于判断信息是否具有投资价值
     */
    judgeModel: {
      provider: 'google' | 'qwen' | 'openai';
      model: 'small' | 'medium' | 'large';
      temperature: number; // 通常设置较低，确保判断一致性
    };
  };
}

/**
 * Investment域配置实例
 * 从环境变量读取配置，提供默认值
 */
export const investmentConfig: InvestmentConfig = {
  datasource: {
    baseUrl: process.env.DATASOURCE_BASE_URL || 'https://djirai.onrender.com',
    apiKey: process.env.DJ_API_KEY || 'djapi_4d4602c51815ede8f193ed197b79fd3052565163279f4ef694914806',
    debug: process.env.DATASOURCE_DEBUG === 'true',
    disableTimestampCache: process.env.DISABLE_TIMESTAMP_CACHE === 'true',
    batchInterval: parseInt(process.env.DATASOURCE_BATCH_INTERVAL || '300000'), // 默认5分钟
    subscriptionInterval: parseInt(process.env.DATASOURCE_SUBSCRIPTION_INTERVAL || '300000'), // 默认5分钟
    subscriptionStartDelay: parseInt(process.env.DATASOURCE_START_DELAY || '15000'), // 默认15秒
    reportInterval: parseInt(process.env.DATASOURCE_REPORT_INTERVAL || '1800000'), // 默认30分钟（旧版兼容）
    
    reports: {
      investment: {
        timerIntervalMinutes: parseInt(process.env.INVESTMENT_TIMER_INTERVAL || '720'), // 默认12小时
        reportIntervalMinutes: parseInt(process.env.INVESTMENT_REPORT_INTERVAL || '720'), // 默认12小时
        targetLimit: parseInt(process.env.INVESTMENT_TARGET_LIMIT || '15'), // 默认15个标的
      },
      timing: {
        timerIntervalMinutes: parseInt(process.env.TIMING_TIMER_INTERVAL || '720'), // 默认12小时
        reportIntervalMinutes: parseInt(process.env.TIMING_REPORT_INTERVAL || '720'), // 默认12小时
        signalWindowMinutes: parseInt(process.env.TIMING_SIGNAL_WINDOW || '1440'), // 默认24小时全天分析
      },
    },
  },
  
  ai: {
    analysisModel: {
      provider: 'google',
      model: 'medium',
      temperature: 0.3,
    },
    judgeModel: {
      provider: 'google',
      model: 'medium',
      temperature: 0.1,
    },
    // analysisModel: {
    //   provider: 'qwen',
    //   model: 'large',
    //   temperature: 0.3,
    // },
    // judgeModel: {
    //   provider: 'qwen',
    //   model: 'large',
    //   temperature: 0.1,
    // },
  },
};