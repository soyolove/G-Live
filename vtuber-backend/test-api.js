const axios = require('axios');

// 测试 TTS API
async function testTTS() {
  try {
    console.log('📡 测试 TTS API...\n');

    const response = await axios.post('http://localhost:8011/api/tts/test', {
      text: '大家好！欢迎来到我的直播间！今天我们要玩一些有趣的游戏哦！'
    });

    console.log('✅ 测试成功！');
    console.log('音频 URL:', response.data.audioUrl);
    console.log('完整响应:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 测试带 TTS 的字幕
async function testSubtitleWithTTS() {
  try {
    console.log('\n📡 测试字幕 + TTS...\n');

    const response = await axios.post('http://localhost:8011/api/control/subtitle-tts', {
      text: '哇！谢谢大家的礼物！你们太棒了！',
      type: 'response',
      duration: 5000,
      enableTTS: true
    });

    console.log('✅ 测试成功！');
    console.log('响应:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 获取存储信息
async function getStorageInfo() {
  try {
    console.log('\n📊 获取存储信息...\n');

    const response = await axios.get('http://localhost:8011/api/tts/info');

    console.log('存储信息:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ 获取失败:', error.response?.data || error.message);
  }
}

// 运行所有测试
async function runTests() {
  console.log('=== VTuber Backend TTS API 测试 ===\n');
  console.log('确保 backend 服务已启动在 http://localhost:8011\n');

  await testTTS();
  await testSubtitleWithTTS();
  await getStorageInfo();

  console.log('\n=== 测试完成 ===');
}

// 执行测试
runTests().catch(console.error);