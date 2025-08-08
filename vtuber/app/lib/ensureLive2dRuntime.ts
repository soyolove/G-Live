let cubism2Loaded = false;
let cubism4Loaded = false;

export async function ensureLive2DRuntime() {
  if (!(window as any).PIXI) {
    const PIXI = await import("pixi.js");
    (window as any).PIXI = PIXI;
  }

  if (!cubism2Loaded && !(window as any).Live2D) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/live2d.min.js";
      script.onload = () => {
        cubism2Loaded = true;
        resolve(true);
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  if (!cubism4Loaded && !(window as any).Live2DCubismCore) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/live2dcubismcore.min.js";
      script.onload = () => {
        cubism4Loaded = true;
        resolve(true);
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
}
