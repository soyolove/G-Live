import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

interface ModelInfo {
  name: string;
  path: string;
  type: 'cubism2' | 'cubism4';
}

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public', 'models');
    const models: ModelInfo[] = [];

    try {
      const folders = await fs.readdir(publicDir);
      
      for (const folder of folders) {
        const folderPath = path.join(publicDir, folder);
        const stats = await fs.stat(folderPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(folderPath);
          
          // Check for Cubism 4 model
          const model3File = files.find(f => f.endsWith('.model3.json'));
          if (model3File) {
            models.push({
              name: folder,
              path: `/models/${folder}/${model3File}`,
              type: 'cubism4'
            });
            continue;
          }
          
          // Check for Cubism 2 model
          const modelFile = files.find(f => f.endsWith('.model.json'));
          if (modelFile) {
            models.push({
              name: folder,
              path: `/models/${folder}/${modelFile}`,
              type: 'cubism2'
            });
          }
        }
      }
    } catch (err) {
      // Directory doesn't exist yet
      console.log('Models directory not found');
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error scanning models:', error);
    return NextResponse.json({ models: [], error: 'Failed to scan models' }, { status: 500 });
  }
}