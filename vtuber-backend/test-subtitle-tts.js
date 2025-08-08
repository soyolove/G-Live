const axios = require('axios');

// 测试字幕 + TTS 功能
async function testSubtitleWithTTS() {
  try {
    console.log('🎤 测试字幕 + TTS 功能...\n');

    const testMessages = [
      {
        text: '大家好！欢迎来到我的直播间！',
        type: 'response',
        duration: 5000,
      },
      {
        text: '哇，谢谢你的礼物！',
        type: 'reaction',
        duration: 3000,
      },
      {
        text: '正在加载中...',
        type: 'status',
        duration: 2000,
        enableTTS: false, // 状态消息不需要语音
      },
      {
        text: '让我们一起玩个游戏吧！',
        type: 'response',
        duration: 4000,
      },
    ];

    for (let i = 0; i < testMessages.length; i++) {
      const message = testMessages[i];
      console.log(`\n--- 测试 ${i + 1}/${testMessages.length} ---`);
      console.log(`文本: ${message.text}`);
      console.log(`类型: ${message.type}`);
      console.log(`TTS: ${message.enableTTS !== false ? '启用' : '禁用'}`);

      try {
        const response = await axios.post('http://localhost:8011/api/control/subtitle', message);
        
        console.log('✅ 发送成功');
        console.log(`客户端数: ${response.data.clients}`);
        
        if (response.data.audio) {
          console.log(`🔊 语音文件: ${response.data.audio.filename}`);
          console.log(`   URL: http://localhost:8011${response.data.audio.url}`);
          console.log(`   时长: ${response.data.audio.duration}ms`);
          console.log(`   大小: ${(response.data.audio.size / 1024).toFixed(2)}KB`);
        } else {
          console.log('📝 仅显示字幕（无语音）');
        }

      } catch (error) {
        console.error('❌ 发送失败:', error.response?.data || error.message);
      }

      // 等待一段时间再发送下一个
      if (i < testMessages.length - 1) {
        const waitTime = message.duration || 3000;
        console.log(`\n⏳ 等待 ${waitTime / 1000} 秒...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    console.log('\n\n=== 测试完成 ===');

    // 获取 TTS 存储信息
    console.log('\n📊 获取 TTS 存储信息...');
    try {
      const infoResponse = await axios.get('http://localhost:8011/api/tts/info');
      console.log('TTS 存储信息:');
      console.log(`- 文件总数: ${infoResponse.data.totalFiles}`);
      console.log(`- 总大小: ${infoResponse.data.totalSizeMB} MB`);
      if (infoResponse.data.newestFile) {
        console.log(`- 最新文件: ${infoResponse.data.newestFile.filename}`);
      }
    } catch (error) {
      console.error('获取存储信息失败:', error.message);
    }

  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 运行测试
console.log('=== VTuber 字幕 + TTS 测试 ===');
console.log('确保以下服务已启动:');
console.log('1. 后端服务: http://localhost:8011');
console.log('2. 前端页面已打开并连接 SSE');
console.log('');

testSubtitleWithTTS();