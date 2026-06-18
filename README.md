# TTS Web V1

基于 Next.js 和 MiniMax 国内版 Async Long TTS 的长文本语音生成工具。

## 本地运行

```bash
npm install
copy .env.example .env.local
npm run dev
```

打开 <http://localhost:3000>。

## 环境变量

根据 `.env.example` 在本地或部署平台配置：

- `ACCESS_PASSWORD`：网页访问密码
- `MINIMAX_BASE_URL`：MiniMax 国内版 API 地址
- `MINIMAX_API_KEY`：MiniMax API Key
- `MINIMAX_TTS_MODEL`：语音模型

`.env.local` 包含敏感信息，不应提交到 GitHub。

## 部署说明

部署平台必须单独配置上述环境变量，否则登录和语音生成无法使用。

线上版本采用无状态异步流程，不保存历史任务或音频文件。生成完成后应及时播放或下载，因为 MiniMax 的临时文件会过期。

## 检查

```bash
npm run lint
npx tsc --noEmit
npm run build
```
