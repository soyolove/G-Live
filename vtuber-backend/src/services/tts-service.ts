import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// TTS 配置
const TTS_CONFIG = {
  url: 'https://openspeech.bytedance.com/api/v1/tts',
  appId: process.env.VOLCANO_TTS_APP_ID || '',
  token: process.env.VOLCANO_TTS_TOKEN || '',
  cluster: 'volcano_tts',
  voiceType: 'ICL_zh_female_jiaoruoluoli_tob', // 娇弱萝莉音
};

// TTS 请求类型定义
interface TTSRequest {
  app: {
    appid: string;
    token: string;
    cluster: string;
  };
  user: {
    uid: string;
  };
  audio: {
    voice_type: string;
    encoding: 'mp3' | 'wav' | 'pcm' | 'ogg_opus';
    speed_ratio?: number;
    loudness_ratio?: number;
  };
  request: {
    reqid: string;
    text: string;
    operation: 'query';
    silence_duration?: number;
    with_timestamp?: number;
  };
}

interface TTSResponse {
  reqid: string;
  code: number;
  operation: string;
  message: string;
  sequence: number;
  data: string;
  addition?: {
    duration?: string;
  };
}

// 生成的音频信息
export interface AudioInfo {
  filename: string;
  url: string;
  path: string;
  duration: number;
  size: number;
  timestamp: number;
  text: string;
}

class TTSService {
  private outputDir: string;
  private audioBaseUrl: string;

  constructor() {
    // 音频文件存储目录
    this.outputDir = path.join(process.cwd(), 'public', 'audio', 'tts');
    this.audioBaseUrl = '/audio/tts';
    
    // 确保输出目录存在
    this.ensureOutputDir();
  }

  private ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 创建 TTS 音频目录: ${this.outputDir}`);
    }
  }

  /**
   * 生成音频文件名
   * 格式：tts_[时间戳]_[8位随机ID].mp3
   * 例如：tts_1703123456789_a1b2c3d4.mp3
   */
  private generateFilename(): string {
    const timestamp = Date.now();
    const randomId = uuidv4().substring(0, 8);
    return `tts_${timestamp}_${randomId}.mp3`;
  }

  /**
   * 清理过期的音频文件
   * @param maxAge 最大保存时长（毫秒），默认24小时
   */
  async cleanupOldFiles(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let deletedCount = 0;

    try {
      const files = fs.readdirSync(this.outputDir);
      
      for (const file of files) {
        if (!file.startsWith('tts_') || !file.endsWith('.mp3')) {
          continue;
        }

        // 从文件名中提取时间戳
        const match = file.match(/tts_(\d+)_/);
        if (!match) continue;

        const fileTimestamp = parseInt(match[1]);
        const fileAge = now - fileTimestamp;

        if (fileAge > maxAge) {
          const filePath = path.join(this.outputDir, file);
          fs.unlinkSync(filePath);
          deletedCount++;
          console.log(`🗑️  删除过期音频文件: ${file}`);
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ 清理完成，删除了 ${deletedCount} 个过期文件`);
      }
    } catch (error) {
      console.error('清理音频文件失败:', error);
    }

    return deletedCount;
  }

  /**
   * 生成语音
   * @param text 要转换的文本
   * @returns 音频文件信息
   */
  async generateSpeech(text: string): Promise<AudioInfo> {
    // 检查配置
    if (!TTS_CONFIG.appId || !TTS_CONFIG.token) {
      throw new Error('TTS 服务未配置：缺少 VOLCANO_TTS_APP_ID 或 VOLCANO_TTS_TOKEN');
    }

    const filename = this.generateFilename();
    const filePath = path.join(this.outputDir, filename);
    const fileUrl = `${this.audioBaseUrl}/${filename}`;

    try {
      // 准备请求
      const request: TTSRequest = {
        app: {
          appid: TTS_CONFIG.appId,
          token: TTS_CONFIG.token,
          cluster: TTS_CONFIG.cluster,
        },
        user: {
          uid: 'jilive-vtuber',
        },
        audio: {
          voice_type: TTS_CONFIG.voiceType,
          encoding: 'mp3',
          speed_ratio: 1.0,
          loudness_ratio: 1.0,
        },
        request: {
          reqid: uuidv4(),
          text: text,
          operation: 'query',
          silence_duration: 500,
        },
      };

      console.log(`🎤 生成语音: "${text}" -> ${filename}`);

      // 调用 API
      const response = await axios.post<TTSResponse>(
        TTS_CONFIG.url,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer;${TTS_CONFIG.token}`,
          },
        }
      );

      // 检查响应
      if (response.data.code !== 3000) {
        throw new Error(`TTS API 错误: ${response.data.message} (错误码: ${response.data.code})`);
      }

      // 解码音频数据
      const audioBuffer = Buffer.from(response.data.data, 'base64');
      
      // 保存文件
      fs.writeFileSync(filePath, audioBuffer);

      // 返回音频信息
      const audioInfo: AudioInfo = {
        filename,
        url: fileUrl,
        path: filePath,
        duration: parseInt(response.data.addition?.duration || '0'),
        size: audioBuffer.length,
        timestamp: Date.now(),
        text,
      };

      console.log(`✅ 语音生成成功: ${filename} (${(audioInfo.size / 1024).toFixed(2)}KB, ${audioInfo.duration}ms)`);

      return audioInfo;

    } catch (error: any) {
      console.error(`❌ 生成语音失败: ${error.message}`);
      
      // 如果文件已创建但失败，删除它
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      throw error;
    }
  }

  /**
   * 获取音频存储信息
   */
  async getStorageInfo() {
    try {
      const files = fs.readdirSync(this.outputDir);
      const ttsFiles = files.filter(f => f.startsWith('tts_') && f.endsWith('.mp3'));
      
      let totalSize = 0;
      const fileInfos = ttsFiles.map(file => {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;

        // 提取时间戳
        const match = file.match(/tts_(\d+)_/);
        const timestamp = match ? parseInt(match[1]) : 0;

        return {
          filename: file,
          size: stats.size,
          timestamp,
          age: Date.now() - timestamp,
        };
      });

      // 按时间戳排序（最新的在前）
      fileInfos.sort((a, b) => b.timestamp - a.timestamp);

      return {
        totalFiles: ttsFiles.length,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        oldestFile: fileInfos[fileInfos.length - 1],
        newestFile: fileInfos[0],
        files: fileInfos.slice(0, 10), // 只返回最新的10个文件
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        totalSizeMB: '0',
        files: [],
      };
    }
  }
}

// 导出单例
export const ttsService = new TTSService();