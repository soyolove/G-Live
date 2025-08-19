import express, { Request, Response } from 'express';
import cors from 'cors';
import { generateFlowId, InvestmentHandler } from '@/investment/handler';
import type { Agent } from '@alice/wond-v3';

interface ServerDependencies {
  investmentHandler: InvestmentHandler;
  testAgent: Agent;
  pumpRecord: (recordData: {
    recordId: string;
    entityId: string;
    entityName: string;
    dataSourceType: 'info' | 'strategy';
    content: string;
    metadata: any;
    createdAt: string;
  }) => void;
  port?: number;  // 可配置端口
}

export function startApiServer(deps: ServerDependencies) {
  const { investmentHandler, testAgent, pumpRecord } = deps;
  const app = express();
  const PORT = deps.port || 8101;  // 默认8101

  // Middleware
  app.use(cors());
  app.use(express.json());

  // ============================================================================
  // FLOW MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * 注入测试数据流
   */
  app.post('/api/test/inject-flow', async (req, res) => {
    try {
      const { events } = req.body;
      
      if (!events || !Array.isArray(events)) {
        res.status(400).json({ error: 'Invalid request: events array required' });
        return;
      }
      
      // 生成新的Flow ID
      const flowId = generateFlowId();
      
      // 开始追踪Flow
      await investmentHandler.trackFlowStart(flowId, events);
      
      // 通过DataSourcePump泵入每个事件
      const injectedEvents = [];
      for (const eventData of events) {
        // 确保事件有正确的格式
        const record = {
          recordId: eventData.payload?.recordId || `test-${Date.now()}-${Math.random()}`,
          entityId: eventData.payload?.entityId || 'test-entity',
          entityName: eventData.payload?.entityName || 'Test Source',
          dataSourceType: (eventData.payload?.dataSourceType || 'info') as 'info' | 'strategy',
          content: eventData.payload?.content || '',
          metadata: eventData.payload?.metadata || {},
          createdAt: eventData.payload?.createdAt || new Date().toISOString(),
          flowId: flowId  // 添加flowId
        };
        
        // 通过pump泵入事件到Agent的EventPool
        pumpRecord(record);
        
        injectedEvents.push({
          ...record,
          flowId,
          injectedAt: new Date().toISOString()
        });
      }
      
      res.json({
        success: true,
        flowId,
        eventsInjected: injectedEvents.length,
        message: `Flow ${flowId} started with ${events.length} events`
      });
      
    } catch (error) {
      console.error('[API] Error injecting flow:', error);
      res.status(500).json({ error: 'Failed to inject flow' });
    }
  });

  /**
   * 获取所有Flows
   */
  app.get('/api/flows', async (req, res) => {
    try {
    const limit = parseInt(req.query.limit as string) || 50;
    const flowIds = await investmentHandler.getAllFlows(limit);
    
    // 获取每个Flow的基本信息
    const flows = [];
    for (const flowId of flowIds) {
      const flowData = await investmentHandler.getFlowTrace(flowId);
      if (flowData) {
        flows.push({
          flowId: flowData.flowId,
          status: flowData.status,
          inputEventCount: flowData.inputEvents.length,
          outputEventCount: flowData.outputEvents.length,
          controllersTriggered: flowData.controllers.length,
          startTime: flowData.startTime,
          endTime: flowData.endTime,
          processingTime: flowData.endTime ? flowData.endTime - flowData.startTime : null
        });
      }
    }
    
    res.json({
      total: flows.length,
      flows
    });
    
  } catch (error) {
    console.error('[API] Error getting flows:', error);
    res.status(500).json({ error: 'Failed to get flows' });
  }
});

  /**
   * 获取特定Flow的详细信息
   */
  app.get('/api/flow/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    const flowData = await investmentHandler.getFlowTrace(flowId);
    
    if (!flowData) {
      res.status(404).json({ error: 'Flow not found' });
      return;
    }
    
    res.json(flowData);
    
  } catch (error) {
    console.error('[API] Error getting flow details:', error);
    res.status(500).json({ error: 'Failed to get flow details' });
  }
});

  /**
   * 清理所有Handler缓存数据
   */
  app.delete('/api/handler/clear-cache', async (req, res) => {
    try {
      await investmentHandler.clearAllHandlerData();
      res.json({
        success: true,
        message: 'All handler cache data cleared successfully'
      });
    } catch (error) {
      console.error('[API] Error clearing handler cache:', error);
      res.status(500).json({ error: 'Failed to clear handler cache' });
    }
  });

// ============================================================================
// CONTROLLER ENDPOINTS
// ============================================================================

  /**
   * 获取所有可用的Controller列表
   */
  app.get('/api/controllers/available', async (req, res) => {
    try {
      const controllers = await investmentHandler.getAvailableControllers();
      
      res.json({
        controllers: controllers,
        count: controllers.length,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('[API] Error getting available controllers:', error);
      res.status(500).json({ error: 'Failed to get available controllers' });
    }
  });

  /**
   * 获取Controller的执行历史
   */
  app.get('/api/controller/:name/executions', async (req, res) => {
  try {
    const { name } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const history = await investmentHandler.getControllerHistory(name, limit);
    
    res.json({
      controllerName: name,
      executionCount: history.length,
      executions: history
    });
    
  } catch (error) {
    console.error('[API] Error getting controller history:', error);
    res.status(500).json({ error: 'Failed to get controller history' });
  }
});

  /**
   * 获取Controller在特定Flow中的表现
   */
  app.get('/api/controller/:name/flow/:flowId', async (req, res) => {
  try {
    const { name, flowId } = req.params;
    
    const flowData = await investmentHandler.getFlowTrace(flowId);
    if (!flowData) {
      res.status(404).json({ error: 'Flow not found' });
      return;
    }
    
    // 从Flow数据中提取特定Controller的信息
    const controllerData = (flowData as any).controllerData?.[name];
    
    if (!controllerData) {
      res.status(404).json({ error: 'Controller not found in this flow' });
      return;
    }
    
    res.json({
      flowId,
      controllerName: name,
      data: controllerData
    });
    
  } catch (error) {
    console.error('[API] Error getting controller flow data:', error);
    res.status(500).json({ error: 'Failed to get controller flow data' });
  }
});

// ============================================================================
// HEALTH & STATUS
// ============================================================================

  app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    port: PORT,
    trackingEnabled: !!investmentHandler,  // 如果有handler就是启用追踪
    timestamp: new Date().toISOString()
  });
});

  // ============================================================================
  // START SERVER
  // ============================================================================

  app.listen(PORT, () => {
    console.log(`📊 Investment Evaluation API Server started on port ${PORT}`);
    console.log(`🔗 API available at http://localhost:${PORT}/api`);
    console.log('');
    console.log('Available endpoints:');
    console.log(`  POST /api/test/inject-flow - Inject test data flow`);
    console.log(`  GET  /api/flows - List all flows`);
    console.log(`  GET  /api/flow/:flowId - Get flow details`);
    console.log(`  GET  /api/controller/:name/executions - Controller history`);
    console.log(`  GET  /api/controller/:name/flow/:flowId - Controller in specific flow`);
    console.log(`  GET  /api/health - Health check`);
  });
}