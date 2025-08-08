"use client";

import { useState, useEffect } from "react";
import { Card } from '@/components/ui/card';
import { Upload, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { uploadFiles } from "../lib/upload";
import type { ExtendedFileList, ModelSettings } from "../lib/types";

interface DropZoneProps {
  onModelUpload: (files: File[] | ExtendedFileList, settings?: ModelSettings) => void;
  onError: (error: Error) => void;
}

export default function DropZone({ onModelUpload, onError }: DropZoneProps) {
  const [draggingOver, setDraggingOver] = useState(false);

  useEffect(() => {
    const isDraggingFile = (e: DragEvent) => {
      if (e.dataTransfer?.types) {
        return e.dataTransfer.types.includes("Files");
      }
      return false;
    };

    const handleDragEnter = (e: DragEvent) => {
      if (isDraggingFile(e)) {
        e.preventDefault();
        setDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (isDraggingFile(e) && !e.relatedTarget) {
        e.preventDefault();
        setDraggingOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      if (isDraggingFile(e)) {
        e.preventDefault();
      }
    };

    const handleDrop = async (e: DragEvent) => {
      if (isDraggingFile(e)) {
        e.preventDefault();
        setDraggingOver(false);

        if (e.dataTransfer?.files.length) {
          const files = Array.from(e.dataTransfer.files);

          try {
            // Check if it's a background image
            if (files.length === 1 && files[0].type.includes("image")) {
              // Handle background image
              console.log("Background image detected");
            } else {
              // Handle model files
              const settingsArray = await uploadFiles(files);

              if (settingsArray.length) {
                for (const settings of settingsArray) {
                  const fileList = files as ExtendedFileList;
                  fileList.settings = settings;
                  onModelUpload(fileList, settings);
                }
              } else {
                onModelUpload(files);
              }
            }
          } catch (e) {
            const error = e as Error;
            error.message = "Failed to load model: " + error.message;
            onError(error);
          }
        }
      }
    };

    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [onModelUpload, onError]);

  return (
    <>
      {draggingOver && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm transition-all">
          <Card className="p-16 bg-primary/10 backdrop-blur-sm border-primary border-2 animate-pulse">
            <div className="flex flex-col items-center space-y-6">
              <div className="p-6 rounded-full bg-primary/20">
                <Upload className="h-12 w-12 text-primary animate-bounce" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-primary">Drop Files Here</h2>
                <p className="text-lg text-muted-foreground">Release to load your Live2D model</p>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Model Files</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Textures</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Motions</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}