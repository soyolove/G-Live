/**
 * Motion Library for Live2D avatar
 * 动作库定义 - 包含所有预设动作序列
 */

export interface MotionFrame {
  x: number;       // 水平坐标 (-1 到 1)
  y: number;       // 垂直坐标 (-1 到 1)
  duration: number; // 持续时间 (ms)
  instant?: boolean; // 是否立即移动到该位置
}

export interface Motion {
  id: string;           // 唯一标识符
  name: string;         // 动作名称（中文）
  description: string;  // 动作描述
  type: 'sequence' | 'single' | 'loop'; // 动作类型
  frames: MotionFrame[]; // 动作帧序列
  defaultSpeed?: number; // 默认速度倍率
  tags?: string[];      // 标签，用于分类和搜索
}

// 动作库列表
export const MOTION_LIBRARY: Motion[] = [
  {
    id: 'nod',
    name: '点头',
    description: '表示肯定、同意的点头动作',
    type: 'sequence',
    frames: [
      { x: 0, y: 0, duration: 300 },     // 中心
      { x: 0, y: 0.5, duration: 300 },   // 向上
      { x: 0, y: 0, duration: 300 },     // 中心
      { x: 0, y: 0.5, duration: 300 },   // 向上
      { x: 0, y: 0, duration: 300 },     // 中心
    ],
    tags: ['affirmative', 'yes', 'agree']
  },
  {
    id: 'shake',
    name: '摇头',
    description: '表示否定、不同意的摇头动作',
    type: 'sequence',
    frames: [
      { x: 0, y: 0, duration: 200 },       // 中心
      { x: -0.4, y: 0, duration: 300 },    // 向左
      { x: 0.4, y: 0, duration: 400 },     // 直接向右（Live2D会自动过渡）
      { x: -0.3, y: 0, duration: 400 },    // 向左（幅度稍小）
      { x: 0.3, y: 0, duration: 400 },     // 向右（幅度稍小）
      { x: 0, y: 0, duration: 300 },       // 回到中心
    ],
    tags: ['negative', 'no', 'disagree']
  },
  {
    id: 'thinking',
    name: '思考',
    description: '表示思考、沉思的动作',
    type: 'sequence',
    frames: [
      { x: 0, y: 0, duration: 300 },      // 中心
      { x: 0.3, y: 0.3, duration: 500 },  // 向右上看
      { x: 0.2, y: 0.4, duration: 600 },  // 继续向上
      { x: 0.3, y: 0.3, duration: 400 },  // 稍微回看
      { x: 0, y: 0, duration: 300 },      // 回到中心
    ],
    tags: ['thinking', 'pondering', 'considering']
  },
  {
    id: 'excited_nod',
    name: '兴奋点头',
    description: '快速兴奋的点头动作',
    type: 'sequence',
    frames: [
      { x: 0, y: 0, duration: 150 },     // 中心
      { x: 0, y: 0.6, duration: 150 },   // 大幅向上
      { x: 0, y: 0, duration: 150 },     // 中心
      { x: 0, y: 0.6, duration: 150 },   // 大幅向上
      { x: 0, y: 0, duration: 150 },     // 中心
      { x: 0, y: 0.4, duration: 150 },   // 小幅向上
      { x: 0, y: 0, duration: 150 },     // 中心
    ],
    defaultSpeed: 1.5,
    tags: ['excited', 'happy', 'enthusiastic']
  },
  {
    id: 'confused',
    name: '困惑',
    description: '表示困惑的轻微摇头',
    type: 'sequence',
    frames: [
      { x: 0, y: 0, duration: 300 },      // 中心
      { x: -0.2, y: 0.1, duration: 400 }, // 微微向左上
      { x: 0.2, y: 0.1, duration: 400 },  // 微微向右上
      { x: 0, y: 0, duration: 300 },      // 中心
    ],
    tags: ['confused', 'puzzled', 'uncertain']
  },
  {
    id: 'look_around',
    name: '环顾四周',
    description: '观察周围环境的动作',
    type: 'sequence',
    frames: [
      { x: 0, y: 0, duration: 300 },      // 中心
      { x: -0.8, y: 0, duration: 500 },   // 向左看
      { x: -0.8, y: -0.3, duration: 300 }, // 向左下
      { x: 0, y: 0, duration: 400 },      // 回到中心
      { x: 0.8, y: 0, duration: 500 },    // 向右看
      { x: 0.8, y: -0.3, duration: 300 }, // 向右下
      { x: 0, y: 0, duration: 400 },      // 回到中心
    ],
    tags: ['curious', 'searching', 'looking']
  },
  {
    id: 'sleepy',
    name: '困倦',
    description: '表示困倦的缓慢低头动作',
    type: 'sequence',
    frames: [
      { x: 0, y: 0, duration: 500 },      // 中心
      { x: 0, y: -0.3, duration: 800 },   // 缓慢低头
      { x: 0, y: -0.4, duration: 600 },   // 继续低头
      { x: 0, y: -0.2, duration: 700 },   // 稍微抬头
      { x: 0, y: -0.4, duration: 800 },   // 又低头
      { x: 0, y: 0, duration: 500 },      // 回到中心
    ],
    tags: ['tired', 'sleepy', 'drowsy']
  },
  {
    id: 'greeting',
    name: '打招呼',
    description: '轻微点头打招呼',
    type: 'sequence',
    frames: [
      { x: 0, y: 0, duration: 200 },      // 中心
      { x: 0, y: 0.3, duration: 250 },    // 轻微向上
      { x: 0, y: 0, duration: 200 },      // 中心
    ],
    tags: ['greeting', 'hello', 'welcome']
  },
  {
    id: 'reset',
    name: '复位',
    description: '回到中心位置',
    type: 'single',
    frames: [
      { x: 0, y: 0, duration: 300, instant: true }
    ],
    tags: ['reset', 'center', 'neutral']
  }
];

// 工具函数：根据ID获取动作
export function getMotionById(id: string): Motion | undefined {
  return MOTION_LIBRARY.find(motion => motion.id === id);
}

// 工具函数：根据标签获取动作列表
export function getMotionsByTag(tag: string): Motion[] {
  return MOTION_LIBRARY.filter(motion => 
    motion.tags?.includes(tag) || false
  );
}

// 工具函数：获取所有动作ID列表
export function getAllMotionIds(): string[] {
  return MOTION_LIBRARY.map(motion => motion.id);
}

// 导出动作类型（用于类型检查）
export type MotionId = 
  | 'nod' 
  | 'shake' 
  | 'thinking' 
  | 'excited_nod' 
  | 'confused' 
  | 'look_around' 
  | 'sleepy' 
  | 'greeting' 
  | 'reset';