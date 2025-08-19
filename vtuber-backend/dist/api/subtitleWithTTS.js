"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSubtitleWithTTS = handleSubtitleWithTTS;
exports.handleTTSTest = handleTTSTest;
exports.handleTTSInfo = handleTTSInfo;
exports.handleTTSCleanup = handleTTSCleanup;
const ttsService_1 = require("../tts/ttsService");
/**
 * 增强的字幕接口，支持 TTS
 */
async function handleSubtitleWithTTS(req, res, broadcast, clientsSize) {
    const { text, type = 'response', duration, enableTTS = true // 默认启用 TTS
     } = req.body;
    // 验证输入
    if (!text || text.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'Subtitle text is required'
        });
    }
    const trimmedText = text.trim();
    console.log(`💬 Subtitle with TTS: "${trimmedText}" (type: ${type}, TTS: ${enableTTS})`);
    try {
        let audioUrl;
        // 如果启用 TTS，生成语音
        if (enableTTS) {
            console.log('🎤 生成语音...');
            const ttsResult = await ttsService_1.ttsService.textToSpeech(trimmedText);
            audioUrl = ttsResult.audioUrl;
            console.log('✅ 语音生成成功:', audioUrl);
        }
        // 构建命令
        const command = {
            type: 'subtitle',
            data: {
                text: trimmedText,
                type,
                duration,
                audioUrl // 如果有语音，包含音频 URL
            },
            timestamp: new Date().toISOString()
        };
        // 广播到所有客户端
        broadcast(command);
        res.json({
            success: true,
            command,
            clients: clientsSize
        });
    }
    catch (error) {
        console.error('❌ 处理字幕时出错:', error);
        // 即使 TTS 失败，也要发送字幕
        const fallbackCommand = {
            type: 'subtitle',
            data: { text: trimmedText, type, duration },
            timestamp: new Date().toISOString()
        };
        broadcast(fallbackCommand);
        res.json({
            success: true,
            command: fallbackCommand,
            clients: clientsSize,
            error: 'TTS generation failed, subtitle sent without audio'
        });
    }
}
/**
 * TTS 测试接口
 */
async function handleTTSTest(req, res) {
    const { text } = req.body;
    if (!text || text.trim() === '') {
        return res.status(400).json({
            success: false,
            error: 'Text is required'
        });
    }
    try {
        console.log('🧪 TTS 测试:', text);
        const result = await ttsService_1.ttsService.textToSpeech(text);
        res.json({
            success: true,
            audioUrl: result.audioUrl,
            audioPath: result.audioPath,
            text: result.text,
            createdAt: result.createdAt
        });
    }
    catch (error) {
        console.error('❌ TTS 测试失败:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'TTS generation failed'
        });
    }
}
/**
 * 获取 TTS 存储信息
 */
function handleTTSInfo(req, res) {
    const info = ttsService_1.ttsService.getStorageInfo();
    res.json({
        success: true,
        storage: {
            fileCount: info.fileCount,
            totalSize: info.totalSize,
            totalSizeMB: (info.totalSize / 1024 / 1024).toFixed(2) + ' MB'
        }
    });
}
/**
 * 清理过期的 TTS 文件
 */
async function handleTTSCleanup(req, res) {
    const { maxAge = 24 } = req.body;
    try {
        const deletedCount = await ttsService_1.ttsService.cleanupOldFiles(maxAge);
        res.json({
            success: true,
            deletedCount,
            message: `Cleaned up ${deletedCount} files older than ${maxAge} hours`
        });
    }
    catch (error) {
        console.error('❌ 清理失败:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Cleanup failed'
        });
    }
}
