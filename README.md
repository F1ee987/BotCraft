# BotCraft

AI 机器人搭建平台 —— **单文件**前端 SPA（`BotCraft.html`，约 1.4 MB，零构建、零依赖），在浏览器内可视化创建、编排与发布机器人工作流；另提供 Windows 桌面版 `BotCraft.exe`（pywebview 打包，免安装、免浏览器）。

## 下载

**桌面版（推荐）**：到 [Releases](https://github.com/F1ee987/BotCraft/releases/latest) 下载 `BotCraft.exe`，双击即用。数据持久化在 `%APPDATA%\BotCraft\data.json`，自动备份在 `%APPDATA%\BotCraft\backups\`。程序内置「设置 → 检查更新」可手动检查新版本。

**网页版**：双击打开 `BotCraft.html` 即可；更稳妥的方式是起个静态服务器：

```bash
python -m http.server 8000   # 访问 http://localhost:8000/BotCraft.html
```

## 主要特性

- **机器人编排**：无限画布 + 有向无环图（DAG）引擎，拓扑调度、真实数据流；节点含模型 / 知识检索 / 条件 / 循环 / 代码 / 工具 / HTTP / 子流程 / 人工审批，每节点独立模型与异常策略；支持流式输出、撤销重做、AI 一键编排（🪄）与聊天内改画布（🧩）。
- **知识库**：TF-IDF 切块检索、来源可回溯（文档名 / 段落 / 相关度）、网址导入、内置演示文档。
- **长期记忆**：对话自动提炼，双层注入（常驻 + 按相关度挑选）、语义去重、过期修正、导入导出。
- **对话体验**：多会话与历史搜索、消息重新生成 / 编辑重发、批量任务队列（含降级标记与 CSV/JSON/MD 导出）、提示词库 + 斜杠指令、文体模板、Markdown 富文本。
- **多模态**：图片 / 视频 / 音频输入；文生图（国内免费接口预设，未配置 Key 时回退免费图床）；代码块「▶ 运行」跑在隔离 iframe 沙箱（读不到 API Key、不能联网）。
- **上下文管理**：10 类来源按优先级装箱，保护区永不裁剪；超限自动压缩成要点（带缓存），压缩与裁剪分开展示。
- **模型接入**：OpenAI / 阿里云百炼 / 腾讯混元 / 智谱 / DeepSeek / 自定义 baseURL；**免 Key 模型**一键试用（Pollinations 公共接口）与本地模型（Ollama / LM Studio，地址填 `http://localhost:11434/v1` 并勾选「无需鉴权」）；支持流式、代理转发隐藏 Key、带图消息发给纯文本模型时自动提醒。
- **数据安全（桌面版）**：写盘前自动快照（保留最近 7 份）、一键回滚、容量排行与内联媒体一键清理、应急恢复。数据损坏时绝不静默覆盖。
- **账号与统计**：本地多账号（PBKDF2 哈希）、Token 用量与费用估算（区分实测与估算）、跨源备份迁移。
- **发布**：网页嵌入（iframe 深链）、API 片段、飞书 / 公众号 / 企业微信、模板广场。
- **第三方插件（沙箱）**：外部代码跑在 `sandbox` iframe（无 `allow-same-origin`），安装前实跑隔离自检；联网走域名白名单（桌面版经 Python 代理），内置示例见 `examples/plugins/`。

## 模型配置要点

- 配置项存于 `botcraft.ai.config.v1`（localStorage）：`provider / baseURL / apiKey / model / temperature / maxTokens / directCall / proxyURL`。
- **免 Key**：设置面板点「🆓 免 Key 试用」（Pollinations 公共接口，无需注册）；此类接口容量共享、易限流，429 稍等重试即可。
- **安全**：推荐关闭「浏览器直连」并配置代理 URL，由后端补 `Authorization` 隐藏 Key（`examples/` 有 Node 代理示例）。
- **常见报错**：401 换 Key；403 + "Free quota exhausted" = 免费额度用完（阿里云百炼控制台关闭「用完即停」或换模型）；429 限流稍后重试；5xx 已自动重试。误删数据去「💾 备份」面板回滚（快照文件名即拍摄时刻）。

## 已知限制

- 编排引擎是前端编排器：无并行、无合流语义、无断点续跑；循环 20 次 / 单次运行 200 节点 / 嵌套 5 层为刻意闸门。
- 数据在本地：桌面版落 `%APPDATA%\BotCraft\data.json`；浏览器版依赖 localStorage，换 origin / 清缓存会丢，请用「导出全部配置」迁移。
- 自动备份是防损坏兜底（限频 10 分钟、保留 7 份），不是版本控制；长期留档请导出配置。
- API Key 与备份均为**明文 JSON**，勿外传、勿同步进网盘 / 仓库。
- 代码沙箱与页面同线程：沙箱内死循环会卡住界面（8 秒超时摘除），且仅支持 JS / HTML。

## 构建（开发者）

```bash
# 桌面版打包（构建工作区在仓库外层的 build_exe/ 目录）
build_exe\build.bat                 # 产物 build_exe\dist\BotCraft.exe
python build_exe\release_exe.py     # 发版：上传到 GitHub Releases（token 走 git credential）

# 全链校验（54 项：语法 / CSS / 功能单测 / lint / 断言 / 对比度 / exe 一致性等）
python build_exe\run_all_checks.py

# 重生成图标
python gen_icon.py                  # 加 --dry 只出预览
```

主文件为单文件 `BotCraft.html`（3 个 `<script>` 块），改动请保持作用域不相互污染；测试依赖 jsdom（装在隔离的 node workspace，缺环境时对应项显式变红，不给假绿）。

## 许可证

MIT License — 见 [LICENSE](LICENSE)。
