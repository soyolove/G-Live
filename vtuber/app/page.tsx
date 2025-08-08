"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as PIXI from "pixi.js";
import DropZone from "./components/DropZone";
import ControlPanel from "./components/ControlPanel";
import { MotionControls } from "./components/MotionControls";
import { ensureLive2DRuntime } from "./lib/live2d-loader";
import { useModelManager } from "./hooks/useModelManager";
import { useMotionManager } from "./hooks/useMotionManager";
import { useLive2DControl } from "./hooks/useLive2DControl";
import { useSSEControl } from "./hooks/useSSEControl";
import { ManualControls } from "./components/ManualControls";
import { SubtitleDisplay } from "./components/SubtitleDisplay";
import { AudioControls } from "./components/AudioControls";
import { DraggablePanel } from "./components/DraggablePanel";
import type { ExtendedFileList } from "./lib/types";

interface SubtitleData {
  text: string;
  type: 'response' | 'reaction' | 'status';
  duration?: number;
  timestamp: string;
  audio?: {
    url: string;
    duration: number;
    filename: string;
  } | null;
}

interface LocalModel {
  name: string;
  path: string;
  type: "cubism2" | "cubism4";
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [error, setError] = useState<string>("");
  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [mouseTracking, setMouseTracking] = useState(false); // Fixed to false - library only respects this during initialization
  const [sseEnabled, setSSEEnabled] = useState(false);
  const [sseConnected, setSSEConnected] = useState(false);
  const [sseUrl, setSSEUrl] = useState("http://localhost:8011/sse");
  const [currentSubtitle, setCurrentSubtitle] = useState<SubtitleData | null>(null);

  const { currentModel, modelScale, loadModel, updateModelScale } =
    useModelManager({
      app,
      mouseTracking,
      onError: (err) => setError(err.message),
    });

  const { currentMotion, motionProgress, playMotion } =
    useMotionManager(currentModel);

  // Live2D control methods
  const controls = useLive2DControl({ currentModel, app });

  // Stable error handler
  const handleSSEError = useCallback((err: Error) => {
    console.error("SSE Error:", err);
  }, []);

  // SSE control connection
  useSSEControl({
    enabled: sseEnabled,
    sseUrl,
    controls,
    onConnectionChange: setSSEConnected,
    onError: handleSSEError,
    onSubtitle: (subtitle) => {
      setCurrentSubtitle(subtitle);
      // 如果有音频，自动播放
      if (subtitle.audio && controls.speak) {
        const audioUrl = `http://localhost:8011${subtitle.audio.url}`;
        controls.speak(audioUrl, {
          volume: 1,
          crossOrigin: 'anonymous',
          onFinish: () => {
            console.log('语音播放完成');
          },
          onError: (err) => {
            console.error('语音播放失败:', err);
          }
        });
      }
    },
  });

  useEffect(() => {
    const initApp = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // ✅ 确保 Live2D 运行时已加载
      await ensureLive2DRuntime();

      const pixiApp = new PIXI.Application({
        view: canvas,
        autoStart: true,
        resizeTo: window,
        backgroundAlpha: 0,
        antialias: true,
      });

      setApp(pixiApp);

      // Load default model
      const defaultModel =
        "https://cdn.jsdelivr.net/gh/Eikanya/Live2d-model/Live2D/Senko_Normals/senko.model3.json";
      loadModel(defaultModel).catch((err) => {
        console.error("Failed to load default model:", err);
      });

      // Fetch local models
      fetchLocalModels();
    };

    initApp();

    return () => {
      app?.destroy(true, { children: true });
    };
  }, []);

  // Add wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!currentModel) return;

      e.preventDefault();

      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      const newScale = Math.max(0.1, Math.min(2, modelScale * delta));

      updateModelScale(newScale);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, [currentModel, modelScale, updateModelScale]);

  const fetchLocalModels = async () => {
    try {
      const response = await fetch("/api/models");
      const data = await response.json();
      setLocalModels(data.models || []);
    } catch (err) {
      console.error("Failed to fetch local models:", err);
    }
  };

  const handleModelUpload = async (files: File[] | ExtendedFileList) => {
    try {
      await loadModel(files);
      setError("");
    } catch (err) {
      console.error("Failed to load model:", err);
    }
  };

  const handleError = (error: Error) => {
    setError(error.message);
    console.error(error);
  };

  // Mouse tracking is now fixed to false and set only during model initialization

  return (
    <div className="relative w-screen h-screen bg-background overflow-hidden">
      <DropZone onModelUpload={handleModelUpload} onError={handleError} />

      {/* Model Controls Panel */}
      <DraggablePanel
        initialX={20}
        initialY={20}
        className="z-50"
        title="Model Controls"
      >
        <ControlPanel
          currentModel={currentModel}
          modelScale={modelScale}
          mouseTracking={mouseTracking}
          localModels={localModels}
          onScaleChange={updateModelScale}
          onMouseTrackingChange={setMouseTracking}
          onLoadUrl={async (url) => {
            try {
              await loadModel(url);
              setError("");
            } catch (err) {
              console.error("Failed to load model from URL:", err);
            }
          }}
          onLoadLocalModel={(path) => loadModel(path).catch(console.error)}
        />
      </DraggablePanel>

      {/* Audio Controls Panel */}
      {currentModel && (
        <DraggablePanel
          initialX={20}
          initialY={400}
          className="z-50"
          title="Audio & Lipsync"
        >
          <AudioControls
            controls={controls}
            currentModel={currentModel}
          />
        </DraggablePanel>
      )}

      {/* Manual Controls Panel */}
      {currentModel && (
        <DraggablePanel
          initialX={window.innerWidth - 340}
          initialY={20}
          className="z-50"
          title="Manual Controls"
        >
          <ManualControls
            controls={controls}
            sseConnected={sseConnected}
            sseEnabled={sseEnabled}
            onSSEToggle={setSSEEnabled}
            sseUrl={sseUrl}
            onSSEUrlChange={setSSEUrl}
          />
        </DraggablePanel>
      )}

      {/* Motion Controls Panel */}
      {currentModel && (
        <DraggablePanel
          initialX={20}
          initialY={window.innerHeight - 300}
          className="z-50"
          title="Animations"
        >
          <MotionControls
            currentModel={currentModel}
            currentMotion={currentMotion}
            motionProgress={motionProgress}
            onPlayMotion={(group, index) => {
              playMotion(group, index);
              controls.playMotion(group, index);
            }}
          />
        </DraggablePanel>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg">
            <p className="text-sm font-medium">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Subtitle Display */}
      <SubtitleDisplay subtitle={currentSubtitle} />

      <canvas ref={canvasRef} id="canvas" />
    </div>
  );
}
