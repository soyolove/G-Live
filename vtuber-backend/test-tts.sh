#!/bin/bash

echo "=== 火山引擎 TTS API 测试 ==="
echo ""
echo "⚠️  请确保已设置环境变量："
echo "   - VOLCANO_TTS_APP_ID"
echo "   - VOLCANO_TTS_TOKEN"
echo ""

# 检查环境变量
if [ -z "$VOLCANO_TTS_APP_ID" ] || [ -z "$VOLCANO_TTS_TOKEN" ]; then
    echo "❌ 错误：请先设置环境变量"
    echo ""
    echo "使用方法："
    echo "export VOLCANO_TTS_APP_ID='你的AppID'"
    echo "export VOLCANO_TTS_TOKEN='你的Token'"
    echo ""
    exit 1
fi

echo "✅ 环境变量已设置"
echo ""

# 运行测试
echo "🚀 开始运行 TTS 测试..."
npx tsx src/tts-test.ts