import { Sprite } from "@pixi/sprite";
import { Texture, Renderer } from "@pixi/core";
import { Ticker } from "@pixi/ticker";
import { Container } from "@pixi/display";
import { getLive2DModel, getHitAreaFrames } from "./live2d-loader";
import type { Live2DModelInstance, ExtendedFileList } from "./types";

export class Live2DModel {
  private static BaseLive2DModel: any; // Will be the actual Live2DModel class from the module
  private static HitAreaFrames: new () => Container;
  private static initialized = false;

  static async initialize() {
    if (this.initialized) return;

    this.BaseLive2DModel = await getLive2DModel();
    this.HitAreaFrames = await getHitAreaFrames();
    
    // Register ticker for Live2D animations
    this.BaseLive2DModel.registerTicker(Ticker);
    
    this.initialized = true;
  }

  static async from(source: string | File[] | ExtendedFileList, options?: { autoInteract?: boolean; autoFocus?: boolean; autoHitTest?: boolean }): Promise<Live2DModelInstance> {
    await this.initialize();
    
    const instance = await this.BaseLive2DModel.from(source, options);
    
    // Enhance the instance with our custom methods
    return this.enhance(instance);
  }

  private static enhance(model: Live2DModelInstance): Live2DModelInstance {
    // Add hitAreaFrames
    const HitAreaFramesClass = this.HitAreaFrames;
    model.hitAreaFrames = new HitAreaFramesClass();
    model.hitAreaFrames.visible = false;

    // Add background
    model.background = Sprite.from(Texture.WHITE);
    model.background.alpha = 0.2;
    model.background.visible = false;
    model.backgroundVisible = false;

    // Initialize motion tracking properties
    model.currentMotionStartTime = 0;
    model.currentMotionDuration = 0;

    // Initialize on model loaded
    model.once('modelLoaded', () => {
      model.addChild(model.hitAreaFrames);
      model.addChild(model.background);

      model.background.width = model.internalModel.width;
      model.background.height = model.internalModel.height;

      model.anchor.set(0.5, 0.5);

      model.on('hit', (hitAreaNames: string[]) => {
        startHitMotion(model, hitAreaNames);
      });

      // Motion tracking
      model.currentMotionStartTime = performance.now();
      model.currentMotionDuration = 0;

      if (model.internalModel.motionManager && model.internalModel.motionManager.on) {
        model.internalModel.motionManager.on(
          'motionStart',
          (group: string, index: number) => {
            model.currentMotionStartTime = model.elapsedTime;
            model.currentMotionDuration = 0;

            const motion = model.internalModel.motionManager.motionGroups[group]?.[index];

            if (motion) {
              if ('_loopDurationSeconds' in motion && motion._loopDurationSeconds) {
                model.currentMotionDuration = motion._loopDurationSeconds * 1000;
              } else if ('getDurationMSec' in motion && typeof motion.getDurationMSec === 'function') {
                model.currentMotionDuration = motion.getDurationMSec();
              }
            }
          }
        );
      }

      // Expression tracking
      const expressionManager = model.internalModel.motionManager.expressionManager;

      if (expressionManager) {
        const originalStartMotion = (expressionManager as any)._setExpression;

        (expressionManager as any)._setExpression = (expression: any) => {
          originalStartMotion.call(expressionManager, expression);
          model.emit('expressionSet', expressionManager.expressions.indexOf(expression));
        };

        let reserveExpressionIndex = expressionManager.reserveExpressionIndex;

        Object.defineProperty(expressionManager, 'reserveExpressionIndex', {
          get: () => reserveExpressionIndex,
          set: (index: number) => {
            reserveExpressionIndex = index;
            model.emit('expressionReserved', index);
          },
        });
      }
    });

    // Override updateTransform
    const originalUpdateTransform = model.updateTransform;
    model.updateTransform = function() {
      originalUpdateTransform.call(this);
      
      if (this.backgroundVisible) {
        this.background.updateTransform();
      }
    };

    // Override _render
    const originalRender = model._render;
    model._render = function(renderer: Renderer) {
      if (this.backgroundVisible) {
        this.background.visible = true;
        this.background.render(renderer);
        this.background.visible = false;
      }
      
      originalRender.call(this, renderer);
    };

    return model;
  }
}

function startHitMotion(model: any, hitAreaNames: string[]) {
  for (let area of hitAreaNames) {
    area = area.toLowerCase();

    const possibleGroups = [area, 'tap' + area, 'tap_' + area, 'tap'];

    for (const possibleGroup of possibleGroups) {
      for (let group of Object.keys(model.internalModel.motionManager.definitions)) {
        if (possibleGroup === group.toLowerCase()) {
          model.motion(group);
          return;
        }
      }
    }
  }
}