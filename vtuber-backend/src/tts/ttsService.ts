import { generateSpeech } from '../tts-test';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

interface TTSResult {
  audioUrl: string;     // 相对于 public 目录的 URL
  audioPath: string;    // 文件系统路径
  duration?: number;    // 音频时长（毫秒）
  text: string;         // 原始文本
  createdAt: Date;      // 创建时间
}

class TTSService {
  private audioDir: string;
  private publicDir: string;
  private audioUrlPrefix: string;

  constructor() {
    // 音频文件存储在 public/tts-audio 目录
    this.publicDir = path.join(__dirname, '../../public');
    this.audioDir = path.join(this.publicDir, 'tts-audio');
    this.audioUrlPrefix = '/tts-audio';

    // 确保目录存在
    this.ensureDirectoryExists();
  }

  private ensureDirectoryExists(): void {
    if (!fs.existsSync(this.audioDir)) {
      fs.mkdirSync(this.audioDir, { recursive: true });
      console.log('📁 创建 TTS 音频目录:', this.audioDir);
    }
  }

  /**
   * 生成文件名（包含时间戳和随机 ID）
   */
  private generateFilename(): string {
    const timestamp = new Date().toISOString()
      .replace(/[:.]/g, '-')  // 替换冒号和点，避免文件系统问题
      .replace('T', '_')      // 用下划线分隔日期和时间
      .slice(0, -5);          // 去掉毫秒和 Z
    const randomId = uuidv4().slice(0, 8);
    return `tts_${timestamp}_${randomId}.mp3`;
  }

  /**
   * 文本转语音
   */
  async textToSpeech(text: string): Promise<TTSResult> {
    try {
      // 生成唯一文件名
      const filename = this.generateFilename();
      const audioPath = path.join(this.audioDir, filename);
      const audioUrl = `${this.audioUrlPrefix}/${filename}`;

      console.log(`🎙️ 开始生成语音: "${text.slice(0, 20)}..."`);
      
      // 调用 TTS API
      await generateSpeech(text, audioPath);

      // 获取文件信息
      const stats = fs.statSync(audioPath);
      
      const result: TTSResult = {
        audioUrl,
        audioPath,
        text,
        createdAt: new Date(),
        // duration 需要从 API 响应中获取，这里暂时不设置
      };

      console.log(`✅ 语音生成成功: ${filename}`);
      return result;

    } catch (error) {
      console.error('❌ TTS 服务错误:', error);
      throw error;
    }
  }

  /**
   * 清理过期的音频文件（可以定期运行）
   * @param maxAge 最大保留时间（小时）
   */
  async cleanupOldFiles(maxAge: number = 24): Promise<number> {
    try {
      const files = fs.readdirSync(this.audioDir);
      const now = Date.now();
      const maxAgeMs = maxAge * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        if (!file.startsWith('tts_') || !file.endsWith('.mp3')) {
          continue; // 跳过非 TTS 文件
        }

        const filePath = path.join(this.audioDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAgeMs) {
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️ 删除过期文件: ${file}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ 清理完成，删除了 ${deletedCount} 个过期文件`);
      }

      return deletedCount;
    } catch (error) {
      console.error('❌ 清理文件时出错:', error);
      return 0;
    }
  }

  /**
   * 获取音频目录的磁盘使用情况
   */
  getStorageInfo(): { fileCount: number; totalSize: number } {
    try {
      const files = fs.readdirSync(this.audioDir);
      let totalSize = 0;
      let fileCount = 0;

      for (const file of files) {
        if (file.startsWith('tts_') && file.endsWith('.mp3')) {
          const filePath = path.join(this.audioDir, file);
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          fileCount++;
        }
      }

      return { fileCount, totalSize };
    } catch (error) {
      console.error('❌ 获取存储信息失败:', error);
      return { fileCount: 0, totalSize: 0 };
    }
  }
}

// 导出单例
export const ttsService = new TTSService();