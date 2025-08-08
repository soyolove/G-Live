import type { Container } from "@pixi/display";
import type { Renderer } from "@pixi/core";
import type { ModelSettings as BaseModelSettings } from "pixi-live2d-display-lipsyncpatch";

// Extend File array with settings property
export interface ExtendedFileList extends Array<File> {
  settings?: ModelSettings;
}

// Model Settings types
export interface ModelSettings extends BaseModelSettings {
  name: string;
  _objectURL?: string;
}

// Motion definition types
export interface Motion {
  file?: string;
  File?: string;
  _loopDurationSeconds?: number;
  getDurationMSec?: () => number;
}

export interface MotionGroup {
  [key: string]: Motion[];
}

// Expression Manager types
export interface ExpressionManager {
  expressions: any[];
  reserveExpressionIndex: number;
  _setExpression: (expression: any) => void;
}

// Motion Manager types
export interface MotionManager {
  definitions: { [key: string]: any };
  motionGroups: { [key: string]: Motion[] };
  expressionManager?: ExpressionManager;
  on?: (
    event: string,
    callback: (group: string, index: number) => void
  ) => void;
}

// Focus Controller types
export interface FocusController {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  update: (deltaTime: number) => void;
  focus: (x: number, y: number, instant?: boolean) => void;
  _originalUpdate?: (deltaTime: number) => void;
}

// Internal Model types
export interface InternalModel {
  width: number;
  height: number;
  motionManager: MotionManager;
  focusController: FocusController;
}

// Enhanced Live2D Model types
export interface Live2DModelInstance {
  // From base Live2DModel
  interactive: boolean;
  autoInteract?: boolean; // Deprecated since v0.5.0
  autoFocus?: boolean; // Controls mouse tracking (replaces autoInteract)
  autoHitTest?: boolean; // Controls hit test for tap interactions
  buttonMode?: boolean; // Legacy PIXI property
  scale: { x: number; y: number; set: (value: number) => void };
  x: number;
  y: number;
  alpha: number;
  parent: Container;

  // Model specific
  internalModel: InternalModel;
  elapsedTime: number;
  hitAreaFrames: Container & { visible: boolean };
  background: Container & {
    visible: boolean;
    alpha: number;
    width: number;
    height: number;
  };
  backgroundVisible: boolean;
  currentMotionStartTime: number;
  currentMotionDuration: number;

  motion(group: string, index?: number, priority?: number): Promise<boolean>;
  expression(id: string | number): Promise<boolean>;
  anchor: { set: (x: number, y: number) => void };

  updateTransform(): void;
  _render(renderer: Renderer): void;
  destroy(): void;

  // Container methods
  addChild(child: any): any;
  removeChild(child: any): any;
  
  // Event methods
  on(event: string, fn: Function, context?: any): this;
  once(event: string, fn: Function, context?: any): this;
  emit(event: string, ...args: any[]): boolean;
  removeAllListeners(event?: string): this;
  
  // Interaction methods
  focus?(x: number, y: number, instant?: boolean): void;
  tap?(x: number, y: number): void;
  registerInteraction?(manager: any): void;
  unregisterInteraction?(): void;
  
  // Audio and lipsync methods
  speak?(audioUrl: string, options?: {
    volume?: number;
    expression?: string | number;
    resetExpression?: boolean;
    crossOrigin?: string;
    onFinish?: () => void;
    onError?: (error: Error) => void;
  }): Promise<void>;
  stopSpeaking?(): void;
  stopMotions?(): void;
}

// Live2D Module types
export interface Live2DModule {
  Live2DModel: {
    from(
      source: string | File[] | ExtendedFileList,
      options?: { 
        autoInteract?: boolean; // Deprecated
        autoFocus?: boolean;
        autoHitTest?: boolean;
      }
    ): Promise<Live2DModelInstance>;
    registerTicker(ticker: any): void;
  };
  FileLoader: {
    createSettings(files: File[]): Promise<ModelSettings>;
  };
  Cubism2ModelSettings: new (settings: any) => ModelSettings;
  Cubism4ModelSettings: new (settings: any) => ModelSettings;
}

// Cubism Settings types
export interface Cubism2SettingsJSON {
  url: string;
  model: string;
  textures: string[];
  pose?: string;
  physics?: string;
  motions?: { [key: string]: Array<{ file: string }> };
}

export interface Cubism4SettingsJSON {
  url: string;
  Version: number;
  FileReferences: {
    Moc: string;
    Textures: string[];
    Physics?: string;
    Pose?: string;
    Motions?: { [key: string]: Array<{ File: string }> };
  };
}
