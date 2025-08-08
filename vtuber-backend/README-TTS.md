# 火山引擎 TTS API 集成说明

## 参数说明

根据火山引擎的文档，TTS API 涉及的参数有：

### 1. AppID（应用 ID）
- **作用**：标识你的应用
- **获取方式**：在火山引擎控制台创建应用后获得
- **使用位置**：请求体中的 `app.appid`

### 2. Access Token（访问令牌）
- **作用**：真正的认证凭证
- **获取方式**：在火山引擎控制台获取
- **使用位置**：
  - HTTP Header 中：`Authorization: Bearer;{token}`（注意是分号不是空格）
  - 请求体中的 `app.token`（文档说是 fake token，但还是要填）

### 3. Cluster（集群）
- **作用**：指定使用的服务集群
- **固定值**：`volcano_tts`
- **使用位置**：请求体中的 `app.cluster`

## 关于 "Key" 的说明

如果文档中提到了 "key"，可能指的是：

1. **API Key**：有些服务使用 API Key 认证，但火山引擎 TTS 使用的是 Token
2. **Secret Key**：某些服务需要 Secret Key 来生成签名，但 TTS API 不需要
3. **Access Token**：这是真正的认证令牌，可能在某些地方被称为 "key"

**总结**：火山引擎 TTS API 只需要两个参数：
- AppID（应用标识）
- Access Token（认证令牌）

## 测试步骤

1. 设置环境变量：
   ```bash
   export VOLCANO_TTS_APP_ID='你的AppID'
   export VOLCANO_TTS_TOKEN='你的Access Token'
   ```

2. 运行测试：
   ```bash
   cd apps/jilive-vtuber/backend
   npx tsx src/tts-test.ts
   ```

3. 检查生成的音频文件：
   - 文件保存在 `backend/tts-output/` 目录
   - 可以直接播放 MP3 文件检查效果

## 常见问题

### 401 认证失败
- 检查 Token 是否正确
- 确保 Authorization Header 格式是 `Bearer;token`（分号，不是空格）
- 检查 AppID 和 Token 是否匹配

### 400 参数错误
- 检查音色类型是否正确
- 确保文本不为空
- 验证其他参数格式

### 网络错误
- 检查网络连接
- 确认能访问 `https://openspeech.bytedance.com`