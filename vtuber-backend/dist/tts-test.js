"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTS_CONFIG = void 0;
exports.generateSpeech = generateSpeech;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const dotenv_1 = __importDefault(require("dotenv"));
// 加载 .env 文件中的环境变量
dotenv_1.default.config();
/**
 * 火山引擎 TTS (Text-to-Speech) API 测试程序
 *
 * 功能说明：
 * - 这个程序用来测试火山引擎的语音合成 API
 * - 将文字转换成语音文件（MP3格式）
 * - 可以选择不同的音色（男声/女声）
 *
 * 使用前准备：
 * 1. 去火山引擎控制台申请 AppID 和 Token
 * 2. 设置环境变量：
 *    export VOLCANO_TTS_APP_ID='你的AppID'
 *    export VOLCANO_TTS_TOKEN='你的Token'
 * 3. 运行测试：npx tsx src/tts-test.ts
 *
 * 关于认证参数的说明：
 * - AppID: 应用标识，用于识别你的应用
 * - Token: 访问令牌，但文档说是 "fake token"，实际认证通过 HTTP Header
 * - Access Token (在 Header 中): 真正的认证令牌，通过 Authorization: Bearer;{token} 传递
 *
 * 注意：文档中的 "token" 和 "access token" 是同一个东西，只是用在不同地方：
 * - 在请求体中叫 token（但是假的）
 * - 在 HTTP Header 中叫 access token（真正用于认证的）
 */
// ========== 配置部分 ==========
// TTS API 的配置信息
const TTS_CONFIG = {
    // API 地址（固定的，不用改）
    url: 'https://openspeech.bytedance.com/api/v1/tts',
    // 应用 ID（从火山引擎控制台获取）
    appId: process.env.VOLCANO_TTS_APP_ID || '',
    // 访问令牌（从火山引擎控制台获取）
    token: process.env.VOLCANO_TTS_TOKEN || '',
    // 集群名称（固定值，不用改）
    cluster: 'volcano_tts',
    // 音色选择（可以换成其他音色）
    voiceType: 'ICL_zh_female_jiaoruoluoli_tob', // 娇弱萝莉音
    // 其他可用音色示例：
    // voiceType: 'zh_male_M392_conversation_wvae_bigtts', // 男声-对话风格
    // voiceType: 'zh_female_F7_conversation_wvae_bigtts', // 女声-对话风格（可能需要额外授权）
    // voiceType: 'zh_female_F115_scenes_bigtts', // 女声-场景风格
    // voiceType: 'zh_female_F7', // 简化版女声（可能更容易获得权限）
    // 完整音色列表请查看火山引擎文档
};
exports.TTS_CONFIG = TTS_CONFIG;
// ========== 核心功能部分 ==========
/**
 * 调用火山引擎 TTS API 生成语音
 *
 * @param text - 要转换成语音的文本
 * @param outputPath - 保存音频文件的路径
 *
 * 工作流程：
 * 1. 构建请求参数
 * 2. 发送 HTTP POST 请求到火山引擎
 * 3. 接收 base64 编码的音频数据
 * 4. 解码并保存为 MP3 文件
 */
async function generateSpeech(text, outputPath) {
    try {
        // ===== 第一步：准备请求参数 =====
        const request = {
            // 应用配置（从环境变量读取）
            app: {
                appid: TTS_CONFIG.appId, // 应用 ID，识别你的应用
                token: TTS_CONFIG.token, // 注意：文档说这是 fake token，但还是要填同样的值
                cluster: TTS_CONFIG.cluster, // 集群名称，固定为 'volcano_tts'
            },
            // 用户信息（随便填，用于日志追踪）
            user: {
                uid: 'jilive-vtuber',
            },
            // 音频参数设置
            audio: {
                voice_type: TTS_CONFIG.voiceType, // 音色
                encoding: 'mp3', // 音频格式（mp3 体积小）
                speed_ratio: 1.0, // 语速（1.0 = 正常速度）
                loudness_ratio: 1.0, // 音量（1.0 = 正常音量）
            },
            // 请求内容
            request: {
                reqid: (0, uuid_1.v4)(), // 唯一请求 ID（用 UUID 生成）
                text: text, // 要转语音的文本
                operation: 'query', // HTTP 模式固定用 'query'
                silence_duration: 500, // 句尾添加 500ms 静音（让语音更自然）
            },
        };
        console.log('🎤 调用 TTS API...');
        console.log('文本:', text);
        console.log('请求 ID:', request.request.reqid);
        const response = await axios_1.default.post(TTS_CONFIG.url, request, {
            headers: {
                'Content-Type': 'application/json',
                // 重要：认证格式是 Bearer;token（注意是分号，不是空格）
                'Authorization': `Bearer;${TTS_CONFIG.token}`,
            },
        });
        // ===== 第三步：检查响应状态 =====
        if (response.data.code !== 3000) {
            // 3000 = 成功，其他都是错误
            throw new Error(`TTS API 错误: ${response.data.message} (错误码: ${response.data.code})`);
        }
        console.log('✅ TTS API 响应成功');
        console.log('音频时长:', response.data.addition?.duration, 'ms');
        // ===== 第四步：解码音频数据 =====
        // API 返回的音频是 base64 编码的，需要解码成二进制
        const audioBuffer = Buffer.from(response.data.data, 'base64');
        // ===== 第五步：保存文件 =====
        fs_1.default.writeFileSync(outputPath, audioBuffer);
        console.log('💾 音频已保存到:', outputPath);
        console.log('文件大小:', (audioBuffer.length / 1024).toFixed(2), 'KB');
    }
    catch (error) {
        // 详细的错误处理
        console.error('\n❌ 生成语音失败:');
        if (axios_1.default.isAxiosError(error)) {
            // HTTP 错误
            if (error.response) {
                console.error('HTTP 状态码:', error.response.status);
                console.error('错误信息:', error.response.data);
                // 特殊处理常见错误
                if (error.response.status === 401) {
                    console.error('\n🔑 认证失败！可能的原因：');
                    console.error('1. Token 错误或过期');
                    console.error('2. Authorization Header 格式错误（应该是 Bearer;token 而不是 Bearer token）');
                    console.error('3. AppID 和 Token 不匹配');
                }
                else if (error.response.status === 400) {
                    console.error('\n⚠️  请求参数错误！请检查：');
                    console.error('1. 音色类型是否正确');
                    console.error('2. 文本是否为空');
                    console.error('3. 其他参数格式是否正确');
                }
                else if (error.response.status === 403) {
                    console.error('\n🚫 权限错误！可能的原因：');
                    console.error('1. TTS 服务未开通或未授权');
                    console.error('2. AppID 对应的应用没有 TTS 权限');
                    console.error('3. 音色资源未授权（某些音色需要额外申请）');
                    console.error('\n建议：');
                    console.error('- 登录火山引擎控制台检查服务是否开通');
                    console.error('- 确认应用已获得 TTS 服务权限');
                    console.error('- 尝试使用其他音色，如 zh_male_M392_conversation_wvae_bigtts');
                }
            }
            else {
                console.error('网络错误:', error.message);
            }
        }
        else {
            // 其他错误
            console.error('未知错误:', error);
        }
        throw error;
    }
}
/**
 * 测试程序主函数
 *
 * 功能：
 * 1. 检查必要的环境变量是否已设置
 * 2. 创建输出目录来保存生成的音频文件
 * 3. 使用不同的测试文本生成多个音频文件
 * 4. 展示 API 的基本使用方法
 *
 * 运行方法：
 * - 方法1：直接运行 npx tsx src/tts-test.ts
 * - 方法2：使用脚本 ./test-tts.sh（会检查环境变量）
 * - 方法3：在 package.json 中添加 "test:tts": "tsx src/tts-test.ts"
 */
async function runTests() {
    console.log('=== 火山引擎 TTS API 测试 ===\n');
    // 检查环境变量是否已设置
    // 重要：这两个值必须从火山引擎控制台获取
    if (!TTS_CONFIG.appId || !TTS_CONFIG.token) {
        console.error('❌ 请设置环境变量 VOLCANO_TTS_APP_ID 和 VOLCANO_TTS_TOKEN');
        console.error('\n获取方法：');
        console.error('1. 登录火山引擎控制台：https://console.volcengine.com/');
        console.error('2. 进入「语音技术」->「语音合成」');
        console.error('3. 创建应用，获取 AppID 和 Access Token');
        console.error('4. 设置环境变量：');
        console.error('   export VOLCANO_TTS_APP_ID="你的AppID"');
        console.error('   export VOLCANO_TTS_TOKEN="你的Token"');
        process.exit(1);
    }
    // 创建输出目录来保存生成的音频文件
    // 音频文件会保存在 backend/tts-output/ 目录下
    const outputDir = path_1.default.join(__dirname, '../tts-output');
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
        console.log(`📁 创建输出目录: ${outputDir}`);
    }
    else {
        console.log(`📁 使用已存在的输出目录: ${outputDir}`);
    }
    // 测试用例 - 模拟 VTuber 常用的语句
    // 你可以修改这些文本来测试不同的内容
    const testCases = [
        {
            text: '大家好！欢迎来到我的直播间！', // 欢迎语
            filename: 'welcome.mp3',
            description: '欢迎观众',
        },
        {
            text: '哇，谢谢你的礼物！你真是太棒了！', // 感谢礼物
            filename: 'thanks.mp3',
            description: '感谢礼物',
        },
        {
            text: '让我们一起玩个游戏吧！准备好了吗？', // 游戏互动
            filename: 'game.mp3',
            description: '游戏邀请',
        },
        {
            text: '今天的直播就到这里啦，我们下次再见哦！拜拜～', // 结束语
            filename: 'goodbye.mp3',
            description: '直播结束',
        },
    ];
    // 逐个测试每个用例
    console.log('\n开始生成音频文件...');
    let successCount = 0;
    let failCount = 0;
    for (let i = 0; i < testCases.length; i++) {
        const testCase = testCases[i];
        console.log(`\n--- 测试 ${i + 1}/${testCases.length}: ${testCase.description} ---`);
        const outputPath = path_1.default.join(outputDir, testCase.filename);
        try {
            await generateSpeech(testCase.text, outputPath);
            console.log('✅ 测试成功');
            successCount++;
        }
        catch (error) {
            console.log('❌ 测试失败');
            failCount++;
        }
        // 等待一下，避免请求过快（API 可能有速率限制）
        if (i < testCases.length - 1) {
            console.log('⏳ 等待 1 秒后继续...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    // 输出测试结果总结
    console.log('\n=== 测试完成 ===');
    console.log(`✅ 成功: ${successCount} 个`);
    console.log(`❌ 失败: ${failCount} 个`);
    console.log(`\n📁 音频文件保存在: ${outputDir}`);
    console.log('\n💡 提示：');
    console.log('- 可以直接播放生成的 MP3 文件来检查效果');
    console.log('- 如果想更换音色，修改 TTS_CONFIG.voiceType');
    console.log('- 完整的音色列表请查看火山引擎文档');
}
// 判断是否直接运行此文件（而不是被其他模块导入）
if (require.main === module) {
    console.log('🚀 火山引擎 TTS API 测试程序启动');
    console.log('================================\n');
    // 运行测试并处理错误
    runTests().catch(error => {
        console.error('\n💥 程序异常退出:', error.message);
        process.exit(1);
    });
}
/**
 * 使用示例（在其他文件中）：
 *
 * ```typescript
 * import { generateSpeech } from './tts-test';
 *
 * // 生成单个音频
 * await generateSpeech('你好世界', './output/hello.mp3');
 *
 * // 批量生成
 * const texts = ['文本1', '文本2', '文本3'];
 * for (const [index, text] of texts.entries()) {
 *   await generateSpeech(text, `./output/audio_${index}.mp3`);
 * }
 * ```
 */ 
