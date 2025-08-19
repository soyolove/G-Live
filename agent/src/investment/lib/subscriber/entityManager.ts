import type { EntityInfo } from './dataSourceSubscriber';

/**
 * 可用的数据源实体
 */
let availableEntities: EntityInfo[] = [];

/**
 * 设置可用的数据源实体
 */
export function setAvailableEntities(entities: EntityInfo[]): void {
  availableEntities = entities;
  console.log(`[EntityManager] Updated available entities: ${entities.length} entities`);
}

/**
 * 获取所有可用实体
 */
export function getAvailableEntities(): EntityInfo[] {
  return availableEntities;
}

/**
 * 获取可用实体的 ID 列表
 */
export function getAvailableEntityIds(): string[] {
  return availableEntities.map(e => e.entityId);
}

/**
 * 根据 ID 获取实体信息
 */
export function getEntityById(entityId: string): EntityInfo | undefined {
  return availableEntities.find(e => e.entityId === entityId);
}

/**
 * 根据名称查找实体（支持模糊匹配）
 */
export function findEntityByName(searchTerm: string): EntityInfo | undefined {
  const term = searchTerm.toLowerCase();
  return availableEntities.find(entity => 
    entity.displayName.toLowerCase().includes(term) ||
    entity.entityId.toLowerCase().includes(term)
  );
}