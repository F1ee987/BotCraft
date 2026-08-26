# BotCraft

AI 机器人搭建平台（前端单文件 SPA）——在浏览器内可视化创建、测试、导入/导出与发布机器人工作流，支持多家大模型服务或自定义代理。

---

## 主要特性
- 单文件应用：全部 UI、样式和逻辑内嵌在 `BotCraft.html` 中，方便快速预览与分发。  
- 工作流编排：可视化节点式流程、提示词模板、知识库挂载、插件启用与发布渠道。  
- 模型接入层：支持 OpenAI、阿里云百炼、腾讯混元、智谱等多家提供商与自定义 baseURL；支持流式（SSE）与非流式调用。  
- 本地存储与演示账号：使用 localStorage（对 file:// 做兼容退化为内存）保存配置与数据，内置本地注册/登录用于演示。  
- 导入/导出：支持 JSON 导入/导出工作流；知识库支持常见文本/CSV/JSON 导入。  
- UI 丰富：主题切换、命令面板 (Cmd/Ctrl+K)、拖拽节点、导出/下载、图表分析等。

---

## 文件说明
- BotCraft.html — 主应用（HTML/CSS/JS 全部内嵌）。  
- LICENSE — MIT 许可证（允许商用、修改、分发）。

---

## 快速开始

1. 克隆仓库或下载文件：
   - 直接打开：双击在浏览器中打开 `BotCraft.html`（注意：某些浏览器下 file:// 会对 fetch/localStorage 有限制，脚本中做了部分兼容处理，但网络请求可能被 CORS 限制）。
   - 推荐使用静态服务器（更可靠）：
     - Python：在项目目录运行：
       ```bash
       python -m http.server 8000
       ```
       然后访问 http://localhost:8000/BotCraft.html
     - 或使用 Node 的简单静态服务器：
       ```bash
       npx serve .
       ```

2. 创建并测试机器人：
   - 点击「＋ 创建机器人」 -> 填写名称与描述 -> 进入工作台进行编排与提示词配置。
   - 在聊天区可直接输入消息测试（如果未配置真实 API Key，则会使用内置演示回复降级）。

3. 接入真实大模型：
   - 打开「设置」填入服务商、API Key、Base URL 与模型，或填写代理地址（proxyURL）并关闭“浏览器直连”以保护 Key。
   - 填写后可「测试连接」并保存。保存后工作台的聊天会调真实模型。

---

## 配置说明（重要字段）
- 本地配置存储键：`botcraft.ai.config.v1`（保存在 localStorage 或内存回退）。  
- 主要配置项示例：

```json
{
  "provider": "openai",
  "baseURL": "https://api.openai.com/v1",
  "apiKey": "sk-xxxx",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "maxTokens": 800,
  "directCall": true,
  "proxyURL": ""
}
```

- directCall = true：浏览器直接请求模型接口（需要在浏览器中暴露 API Key —— 不安全）。  
- 推荐做法：directCall = false 并配置 proxyURL，将请求由后端转发并在后端补上 Authorization，从而隐藏 Key。

---

## 示例：简单代理（Node.js + Express）
（演示用途，请在生产中加认证、速率限制与日志等）

```js
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());
const TARGET = 'https://api.openai.com/v1/chat/completions'; // 或根据 provider 动态决定

app.post('/api/ai-proxy', async (req, res) => {
  try {
    // 从安全存储（环境变量）读取 API KEY
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return res.status(500).json({ error: 'No API key configured' });
    const resp = await fetch(TARGET, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    // 将原样响应转发回客户端（注意流式 SSE 场景需要转发流）
    const data = await resp.text();
    res.status(resp.status).send(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(3000, () => console.log('Proxy listening on :3000'));
```

- 部署后在 BotCraft 的设置中填入 proxy 地址（例如 `https://your-domain.com/api/ai-proxy`），并关闭 directCall。

---

## 安全与隐私提示
- 当前实现将 API Key 保存在浏览器 localStorage（或内存回退），不安全用于生产多用户场景。切勿在公共环境或生产部署中直接把 Key 暴露给浏览器。  
- 建议在生产中：使用后端代理（如上示例），并在后端实现认证、审计、限流与 Key 管理。  
- 演示账号与密码使用 PBKDF2-SHA256 本地哈希（仅限演示），不要用于真实敏感账号。  
- 注意 CORS 策略：若使用浏览器直连且 Base URL 不允许跨域访问，请使用代理转发。

---

## 开发者建议（若要推进成可维护项目）
- 将单文件拆分为标准前端项目（HTML/CSS/JS 分离），使用构建工具（Vite/webpack）便于模块化、依赖管理与测试。  
- 增加后端示例：认证、持久化（数据库）、用户隔离与 API Key 安全存储。  
- 加入单元测试与集成测试、Lint、CI（GitHub Actions）。  
- 强化错误上报与埋点，加入后端限流与审计以防滥用。  
- 为插件与模板系统设计安全沙箱与权限模型，避免任意脚本注入与越权访问。

---

## 已知限制
- 单文件结构便于演示但不利于长期维护。  
- 无后端持久化，所有数据均保存在本地（localStorage 或内存回退）。  
- CORS 与浏览器安全策略会限制直接使用某些模型提供商的接口。

---

## 贡献
欢迎提交 issue 或 PR。建议先打开 issue 讨论主要设计变更或大型重构计划。

建议贡献流程（示例）
1. Fork 仓库并新建 feature 分支。  
2. 提交清晰的变更说明与测试用例。  
3. 发起 Pull Request 并在 PR 描述里写明变更动机与兼容注意事项。

---

## 许可证
MIT License — 请参见仓库中的 LICENSE 文件。

---

