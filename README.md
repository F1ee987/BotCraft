# BotCraft

AI 机器人搭建平台 —— **单文件**前端 SPA，在浏览器内可视化创建、测试、编排与发布机器人工作流。全部 UI、样式与逻辑内嵌于 `BotCraft.html`（约 470 KB，零构建、零依赖），双击即可运行，也适合静态托管分发。

---

## 主要特性

**搭建与编排**
- 单文件应用：HTML/CSS/JS 全部内嵌，`BotCraft.html` 一个文件带走即用。
- 多机器人管理：内置 8 个示例机器人 + 自定义机器人；支持从模板一键创建副本、批量管理（勾选后批量复制 / 发布 / 删除）。
- 串行工作流引擎：可视化节点式流程，每个节点独立角色（开始 / 意图识别 / 检索 / 撰写 / 审核 / 去 AI 腔 / 人工审核），独立调用模型、上一步输出自动注入下一步；支持**流式逐字输出**与实时进度显示。
- 每个机器人专属编排：内置与模板机器人各配专属工作流（`ORCH_BY_NAME`），创建/复制时自动套用，加载时按名称兜底，避免共享引用污染。
- 知识库 TF-IDF 检索：自动切块、向量化、余弦相似度召回 Top-5，按节点角色智能注入上下文。
- 长期记忆：对话后自动提炼写入左侧「记忆」面板，**不仅记用户事实，也沉淀 AI 回复里用户未反对的结论/方案/建议/约定，以及用户询问的技术主题 / 代码用法 / 工具配置（记为「术语 / 方案」）**；记忆类型涵盖 偏好 / 事实 / 身份 / 项目 / 禁忌 / 术语 / 约定 / 结论 / 方案 / 建议 / 其他；支持归一化精确去重 + 手动判重；AI 智能提炼失败时用本地规则兜底，确保面板不空；配置 Key 时由 AI 提炼，无 Key 时本地规则仅抽可识别事实（如「我叫 XX」/ 邮箱 / 手机 / #话题）。

**对话体验**
- ⚡ 快速模式：聊天框输入栏正上方一键开关。开启后，编排型机器人也只走**一次直接对话**（跳过串行分步工作流），首字更快、整答更跟手；仍会把编排节点的人设 / 流程设定合并进 system 提示，不退化成普通助手；需要多步推理时关闭即可恢复逐步编排。
- 多模态输入：支持在聊天中发送图片 / 视频 / 音频；图片自动压缩至最长边 1280px、音频转 WAV 直传；若所选模型非视觉模型会给出提示（不阻断发送）。
- 长对话稳定：带上下文预算裁剪（历史 / 系统 / 知识库分别设上限）与请求自动重试（仅瞬态网络 / 408 / 429 / 5xx 重试，4xx 不重试），避免多轮对话后上下文超限或偶发网络错误导致的「调用失败」。
- Markdown 富文本：标题 / 列表 / 任务列表 / 表格 / 引用 / 代码块（带语言标签 + 单独复制按钮）/ 行内码，链接做了 XSS 过滤。
- 输入自适应：聊天输入框随内容动态增高（封顶 160px 内部滚动），Enter 发送、Shift+Enter 换行。
- 文体模板：内置 10 种风格（小红书 / 知乎 / 新闻 / 学术 / 口语 / 幽默 / 官方 / 文艺 / 电商 / 公众号），可一键应用、预览、取消。
- 真实工具执行：联网检索（DuckDuckGo 即时答案，免 Key）、天气查询（open-meteo，免 Key）、日历提醒（到点 Toast）、代码执行器（沙盒试运行）、**文生图（未配置 Key 时自动回退 pollinations.ai 免费图床，无需插件开关，只要用户表达「生成/画一张 XX 图片」意图即自动出图）**。
- 执行日志面板：右下角浮窗实时显示每个工作流节点的角色 / 输出 / 耗时；可拖动、**拖到屏幕边缘收成 46px 小条（贴左/右边缘垂直居中）**、原位展开；支持浅色「阳光模式」跟随主题。

**账号与数据**
- 本地登录：注册 / 登录 / 多账号，密码 PBKDF2-SHA256 本地哈希；顶栏头像下拉一键切换已认证账号（免重输密码）；登录失败有明确提示（密码错误红字等）；访客模式兜底保证进得去应用。
- 跨源备份迁移：导出 / 导入全部配置（机器人 / 知识库 / 收藏 / 设置），解决 file:// 与 localhost 源隔离导致数据互不可见的问题。

**发布与嵌入**
- 发布渠道：网页嵌入（生成 `<iframe>` + 独立嵌入页，带 `?botcfg=` 深链）、API 接口（拼好 system 提示词的 fetch / cURL 片段）、飞书 / 微信公众号 / 企业微信（Webhook / 回调地址）。
- 模板广场：把本地机器人发布成可复用模板，按名称去重、与内置模板混排。

**界面与适配**
- 玻璃拟态 UI、深 / 浅主题切换（日志面板等内联样式用 CSS 变量实时跟随）。
- 侧边栏可收展，折叠态悬停图标显示名称 tooltip。
- 命令面板（Ctrl / Cmd + K）、机器人切换下拉（搜索 + 头像 + 已发布徽标）。
- 移动端适配（≤760px 汉堡菜单 + 单列布局），嵌入模式（`?botcfg=`）只显示聊天区。
- 桌面图标 `botcraft.ico`（玻璃拟态机器人），并提供 `.url` 快捷方式入口。

**模型接入**
- 支持 OpenAI、阿里云百炼、腾讯混元、智谱等多家提供商与自定义 baseURL；支持流式（SSE）与非流式调用；浏览器直连或用后端代理转发以隐藏 Key。

---

## 文件说明
- `BotCraft.html` — 主应用（HTML/CSS/JS 全部内嵌，约 460 KB）。
- `botcraft.ico` — 项目图标（多尺寸玻璃拟态机器人），用于桌面快捷方式与仓库标识。
- `LICENSE` — MIT 许可证（允许商用、修改、分发）。
- `README.md` — 本文件。

> 桌面 `.url` 快捷方式（`BotCraft AI.url`）不在仓库内，需在本机生成：指向 `file:///.../BotCraft.html`，`IconFile` 指向本仓库的 `botcraft.ico`，`IconIndex=0`。`.ico` 切勿移动，否则 `.url` 图标失效。

---

## 快速开始

1. 获取文件：
   - 直接打开：双击在浏览器中打开 `BotCraft.html`。部分浏览器对 `file://` 的 fetch / localStorage 有限制，脚本已做兼容（localStorage 不可用时退化为内存模式），但网络请求可能受 CORS 限制。
   - 推荐用静态服务器（更可靠）：
     ```bash
     # Python
     python -m http.server 8000
     # 然后访问 http://localhost:8000/BotCraft.html
     ```
     ```bash
     # Node
     npx serve .
     ```

2. 创建并测试机器人：
   - 点「＋ 创建机器人」→ 填名称与描述 → 进入工作台编排节点、配置提示词与知识库。
   - 聊天区直接输入测试；未配置真实 API Key 时走内置演示回复降级（不报错不白屏）。

3. 接入真实大模型：
   - 打开「设置」填服务商、API Key、Base URL 与模型；可填代理地址（proxyURL）并关闭「浏览器直连」以保护 Key。
   - 点「测试连接」保存后，聊天即调真实模型。

---

## 配置说明（重要字段）
- 本地配置键：`botcraft.ai.config.v1`（存于 localStorage 或内存回退）。
- 示例：

```json
{
  "provider": "openai",
  "baseURL": "https://api.openai.com/v1",
  "apiKey": "sk-xxxx",
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "maxTokens": 800,
  "directCall": true,
  "proxyURL": "",
  "imageBaseURL": "https://api.openai.com/v1",
  "imageAPIKey": "sk-xxxx",
  "imageModel": "dall-e-3",
  "imageSize": "1024x1024"
}
```

- `directCall = true`：浏览器直接请求模型接口（需在浏览器暴露 API Key，不安全）。
- 推荐：`directCall = false` 并配 `proxyURL`，由后端转发并在后端补 `Authorization`，隐藏 Key。

---

## 示例：简单代理（Node.js + Express）
> 演示用途，生产环境请加认证、限流与日志。

```js
const express = require('express');
const fetch = require('node-fetch');
const app = express();
app.use(express.json());
const TARGET = 'https://api.openai.com/v1/chat/completions';

app.post('/api/ai-proxy', async (req, res) => {
  try {
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
    const data = await resp.text();
    res.status(resp.status).send(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});

app.listen(3000, () => console.log('Proxy listening on :3000'));
```

部署后在设置中填入代理地址（如 `https://your-domain.com/api/ai-proxy`）并关闭 directCall。

---

## 安全与隐私提示
- API Key 保存在浏览器 localStorage（或内存回退），不安全用于多用户生产场景。**「导出全部配置」会包含明文 API Key，请勿外传。**
- 生产建议：用后端代理（如上示例），后端实现认证、审计、限流与 Key 管理。
- 演示账号密码为 PBKDF2-SHA256 本地哈希（仅演示），勿用于真实敏感账号。
- CORS：浏览器直连且 Base URL 不允许跨域时，请改用代理转发。
- 单文件应用无后端，「代码执行器 / PDF 解析」中需外部 API 的部分仅为能力提示或沙盒试运行，无法在本地真正运行。**文生图已可真实执行**：未配置 Key 时回退 pollinations.ai 免费图床，配置了 imageBaseURL + imageAPIKey 后走 OpenAI Images 兼容接口。

---

## 已知限制
- 单文件结构便于演示但不利于长期维护。
- 无后端持久化，数据均保存在本地（localStorage 或内存回退）；换浏览器 / 换 origin / 清缓存会读不到，需用「💾 备份」导出导入迁移。
- CORS 与浏览器安全策略会限制部分模型直连。
- 部分 UI 文案含 emoji，个别场景显示依赖系统字体。

---

## 贡献
欢迎提交 issue 或 PR。建议先开 issue 讨论主要设计变更或大型重构。

1. Fork 仓库并新建 feature 分支。
2. 提交清晰的变更说明（本项目主文件为单文件 `BotCraft.html`，改动请保持 3 个 `<script>` 块作用域不相互污染）。
3. 发起 Pull Request 并写明变更动机与兼容注意事项。

---

## 许可证
MIT License — 请参见仓库中的 LICENSE 文件。
