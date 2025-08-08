// 简单的 API 测试脚本
const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('🧪 Testing Twitch Chat API...\n');

  try {
    // 1. 健康检查
    console.log('1. Health Check...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✅ Health:', health);

    // 2. 连接频道
    console.log('\n2. Connecting to channel...');
    const connectRes = await fetch(`${BASE_URL}/api/channels/shroud/connect`, {
      method: 'POST'
    });
    const connectData = await connectRes.json();
    console.log('✅ Connect:', connectData);

    // 3. 获取频道状态
    console.log('\n3. Getting channel status...');
    const channelsRes = await fetch(`${BASE_URL}/api/channels`);
    const channels = await channelsRes.json();
    console.log('✅ Channels:', channels);

    // 4. 获取消息
    console.log('\n4. Getting messages...');
    const messagesRes = await fetch(`${BASE_URL}/api/channels/shroud/messages`);
    const messages = await messagesRes.json();
    console.log('✅ Messages:', messages);

    console.log('\n🎉 All tests passed!');
    console.log('\n📡 To test SSE stream, run:');
    console.log('curl -N http://localhost:3001/api/channels/shroud/stream');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 运行测试
testAPI();