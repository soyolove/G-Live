import { createManualPump } from 'wond-v3';
import { DataSourceRecordReceived } from '../events';

export function createDataSourcePump() {
  const result = createManualPump(
    {
      type: 'pump',
      pumpType: 'manual',
      name: 'Data Source Pump',
      description: 'Pumps data source records into event pool',
      outputEventTypes: [DataSourceRecordReceived],
    },
    { tag: ['datasource'] },
    {} // Initial state
  );

  /**
   * 手动泵入一条数据源记录
   */
  const pumpRecord = (recordData: {
    recordId: string;
    entityId: string;
    entityName: string;
    dataSourceType: 'info' | 'strategy';
    content: string;
    metadata: any;
    createdAt: string;
    flowId?: string; // 可选的flowId
  }) => {
    const { flowId, ...payload } = recordData;
    console.log(`[DataSourcePump] 泵入记录: ${recordData.recordId} 来自 ${recordData.entityName} (Flow: ${flowId || 'no-flow'})`);

    // 使用新的flowId参数传递
    result.emitter.event(DataSourceRecordReceived).emit(payload, { flowId });
  };

  return {
    pump: result.pump,
    pumpRecord,
  };
}