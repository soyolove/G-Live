import type { Live2DModule } from "./types";

let live2dModule: Live2DModule | null = null;
let isLoading = false;
let loadingPromise: Promise<Live2DModule> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

export async function ensureLive2DRuntime(): Promise<Live2DModule> {
  // 避免重复加载
  if (live2dModule) {
    return live2dModule;
  }

  if (isLoading && loadingPromise) {
    return loadingPromise;
  }

  isLoading = true;

  loadingPromise = (async () => {
    try {
      // 1. 先加载 Cubism 2 运行时
      if (!window.Live2D) {
        await loadScript("/live2d.min.js");
      }

      // 2. 加载 Cubism 4 运行时
      if (!window.Live2DCubismCore) {
        await loadScript("/live2dcubismcore.min.js");
      }

      // 3. 确保 PIXI 在全局可用
      if (!window.PIXI) {
        const PIXI = await import("pixi.js");
        window.PIXI = PIXI;
      }

      // 4. 动态导入 pixi-live2d-display-lipsyncpatch
      live2dModule = (await import(
        "pixi-live2d-display-lipsyncpatch"
      )) as Live2DModule;

      return live2dModule;
    } catch (error) {
      isLoading = false;
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

// 导出常用的类和函数
export async function getLive2DModel() {
  const module = await ensureLive2DRuntime();
  return module.Live2DModel;
}

export async function getHitAreaFrames() {
  await ensureLive2DRuntime();
  const extraModule = await import("pixi-live2d-display-lipsyncpatch/extra");
  return extraModule.HitAreaFrames;
}

export async function getFileLoader() {
  const module = await ensureLive2DRuntime();
  return module.FileLoader;
}

export async function getCubism2ModelSettings() {
  const module = await ensureLive2DRuntime();
  return module.Cubism2ModelSettings;
}

export async function getCubism4ModelSettings() {
  const module = await ensureLive2DRuntime();
  return module.Cubism4ModelSettings;
}
