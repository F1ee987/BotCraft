# BotCraft

AI 机器人搭建平台 —— **单文件**前端 SPA（`BotCraft.html`，约 1.5 MB，零构建、零依赖），在浏览器内可视化创建、编排与发布机器人工作流；另提供 Windows 桌面版 `BotCraft.exe`（pywebview 打包，免安装、免浏览器）。

## 下载

**桌面版（推荐）**：到 [Releases](https://github.com/F1ee987/BotCraft/releases/latest) 下载 `BotCraft.exe`，双击即用。数据持久化在 `%APPDATA%\BotCraft\data.json`，自动备份在 `%APPDATA%\BotCraft\backups\`。程序内置「设置 → 检查更新」可手动检查新版本。

**网页版**：双击打开 `BotCraft.html` 即可；更稳妥的方式是起个静态服务器：

```bash
python -m http.server 8000   # 访问 http://localhost:8000/BotCraft.html
```

## 主要特性

- **机器人编排**：无限画布 + 有向无环图（DAG）引擎，拓扑调度、真实数据流；节点含模型 / 知识检索 / 条件 / 循环 / 代码 / 工具 / HTTP / 子流程 / 人工审批，每节点独立模型与异常策略；支持流式输出、撤销重做、AI 一键编排（🪄）与聊天内改画布（🧩）。
- **知识库**：TF-IDF 切块检索、来源可回溯（文档名 / 段落 / 相关度）、网址导入、**CSDN 文章兼容**、内置演示文档。
- **长期记忆**：对话自动提炼，双层注入（常驻 + 按相关度挑选）、语义去重、过期修正、导入导出。
- **对话体验**：多会话与历史搜索、消息重新生成 / 编辑重发、批量任务队列（含降级标记与 CSV/JSON/MD 导出）、提示词库 + 斜杠指令、文体模板、Markdown 富文本。
- **多模态**：图片 / 视频 / 音频输入；文生图（国内免费接口预设，未配置 Key 时回退免费图床）；代码块「▶ 运行」跑在隔离 iframe 沙箱（读不到 API Key、不能联网）。
- **上下文管理**：13 类来源按优先级装箱（人设 / 专精 / 品牌 / 收尾 / 画布工具 5 类为保护区，预算再紧也不裁剪）；超限自动压缩成要点（带缓存），压缩与裁剪分开展示。知识库正文按 6000 字符预算流式累加。
- **模型接入**：OpenAI / 阿里云百炼 / 腾讯混元 / 智谱 / DeepSeek / 自定义 baseURL；**免 Key 模型**一键试用（Pollinations 公共接口）与本地模型（Ollama / LM Studio，地址填 `http://localhost:11434/v1` 并勾选「无需鉴权」）；支持流式、代理转发隐藏 Key、带图消息发给纯文本模型时自动提醒。
- **数据安全（桌面版）**：写盘前自动快照（限频 10 分钟、保留最近 7 份）、一键回滚、容量排行与内联媒体一键清理、应急恢复。四类 API Key 以 DPAPI 密文落盘（绑定本机 Windows 用户），非 Key 数据仍为明文 JSON。数据损坏时绝不静默覆盖。
- **账号与统计**：本地多账号（PBKDF2-SHA256 加盐哈希）、Token 用量与费用估算（区分实测与估算）、跨源备份迁移。
- **发布**：网页嵌入（iframe 深链，可下载独立 HTML）与 API 片段会产出**可直接使用的代码**；飞书 / 公众号 / 企业微信三渠道只**记录回调地址并给出接入指引**，转发逻辑需自建服务端；模板库为**本机自存自用**，不支持跨机分享。
- **第三方插件（沙箱）**：外部代码跑在 `sandbox` iframe（无 `allow-same-origin`），安装前实跑隔离自检；联网走域名白名单（桌面版经 Python 代理），内置示例见 `examples/plugins/`。

## 模型配置要点

- 配置项存于 `botcraft.ai.config.v1`（localStorage）：`noAuth / provider / baseURL / apiKey / model / temperature / maxTokens / directCall / proxyURL / fallback / fastReply / autoCompress`，另有三组独立子配置 `image*`（文生图）、`search*`（联网检索）、`stt*`（语音识别）。`noAuth=true` 时 Key 留空也可调用，用于免 Key 公共接口与本机模型。
- **免 Key**：设置面板点「🆓 免 Key 试用」（Pollinations 公共接口，无需注册）；此类接口容量共享、易限流，429 稍等重试即可。
- **安全**：推荐关闭「浏览器直连」并配置代理 URL，由后端补 `Authorization` 隐藏 Key。`examples/` 目前只含插件示例（`examples/plugins/`），**不含代理示例**，需自行实现。
- **常见报错**：401 换 Key；403 + "Free quota exhausted" = 免费额度用完（阿里云百炼控制台关闭「用完即停」或换模型）；429 限流稍后重试；5xx 已自动重试。误删数据去「💾 备份」面板回滚（快照文件名即拍摄时刻）。

## 已知限制

- 编排引擎是前端编排器：无并行、无合流语义、无断点续跑；循环 20 次 / 单次运行 200 节点 / 嵌套 5 层为刻意闸门。
- 数据在本地：桌面版落 `%APPDATA%\BotCraft\data.json`；浏览器版依赖 localStorage，换 origin / 清缓存会丢，请用「导出全部配置」迁移。
- 自动备份是防损坏兜底（限频 10 分钟、保留 7 份），不是版本控制；长期留档请导出配置。
- API Key 已 DPAPI 加密，但**其余数据与备份仍为明文 JSON**，勿外传、勿同步进网盘 / 仓库。
- 代码沙箱与页面同线程：沙箱内死循环会卡住界面（8 秒超时摘除），且仅支持 JS / HTML。

## 构建（开发者）

构建工作区在**仓库外层**的 `build_exe/` 目录（不入版本控制）。

```bash
# 桌面版打包
python build_exe\pack_exe.py         # 实际入口：跑 build_run.py，日志落 build_exe\build_log.txt
                                     # 产物 build_exe\dist\BotCraft.exe
build_exe\build.bat                  # 等价的裸 PyInstaller 命令（路径写死在 bat 里）

# 改了 HTML 之后必须做的三步，否则 verify_exe_html 会判内嵌副本过期
python build_exe\pack_exe.py
python build_exe\sync_exe_copies.py --sync   # 同步 Downloads / 仓库根 / dist 三处副本
python build_exe\verify_exe_html.py          # 924 条形态断言

# 全链校验（63 项：语法 / CSS / 功能单测 / lint / 断言 / 对比度 / exe 一致性等）
python build_exe\run_all_checks.py

# 发版：上传到 GitHub Releases（token 走 git credential）
python build_exe\release_exe.py

# 重生成图标
python gen_icon.py                  # 加 --dry 只出预览
```

**注意**：真正打包的是 `pack_exe.py` → `build_run.py`。同目录的 `build_exe.py` 是**桌面版运行时入口**（pywebview 主程序，被 PyInstaller 打包的对象），不是构建脚本 —— 直接跑它只会启动应用。

**版本号有两处，必须同步**：`BotCraft.html` 的 `APP_VERSION`（控制存储迁移）与 `release_exe.py` 的 `TAG`（决定 Release tag 与标题）。二者目前靠手工保持一致，改版本时一并改。`build_exe/_build_commit.txt` 记录打包时的 commit，「检查更新」会比对它 —— 改了 HTML 未重打包会导致对所有用户误报有新版。

主文件为单文件 `BotCraft.html`（4 个 `<script>` 块），改动请保持作用域不相互污染；测试依赖 jsdom（装在隔离的 node workspace，缺环境时对应项显式变红，不给假绿）。

### 基础工具层（改代码前必读）

工具层定义在**第 1 个 `<script>` 块**、紧接安全存储层 `__storage` 之后 —— 必须早于所有使用者（第 1 块自身的后续模块也在用）。它是全局最底层的公共设施，其余模块只依赖它，不允许反向依赖。

| 工具 | 用途 | 关键约定 |
| --- | --- | --- |
| `storeGet(key, fallback)` | 读存储 + JSON 解析 | 键不存在 / 值为 `null` / 解析失败一律返回 `fallback`，**绝不抛**。注意 `fallback` 传 `0` 或 `false` 不会被误判为空 |
| `storeSet(key, val)` | 写存储（自动序列化） | 返回布尔值，`false` 表示配额满或存储被禁用 |
| `storeDel(key)` | 删存储 | 返回布尔值 |
| `storeGetRaw` / `storeSetRaw` | 裸字符串读写（长文本、UI 偏好） | **必须成对使用**。误用 `storeSet` 写、 `storeGetRaw` 读，值会带引号，表现为「配置里凭空多一对引号」，极难排查 |
| `_deepClone(v)` | 结构化深拷贝 | 用于「改副本但不能污染原件」（快照 / 撤销 / 导入合并） |
| `escAttrJs(s)` | **内联 `onclick` 专用**转义 | 见下方转义约定 |

**转义约定（三者语义不同，不可混用）**

- `escapeHtml` —— HTML **文本节点**位置。按设计**不转义引号**（`renderMarkdown` 的 URL 白名单依赖这一性质）。放进属性里等于没转义。
- `escapeAttr` —— HTML **属性值**位置（`value=` / `title=` / `data-*` / `alt=`），会转义引号。
- `escAttrJs` —— 内联 `onclick="fn('${x}')"` 中 `x` 所处的 **JS 单引号字符串**上下文。此前这里误用了 `escapeHtml`，导致备份导入一个 `id` 含 `'` 的数据即可闭合字符串注入任意代码。

**为什么 `escapeAttr` 在 `onclick` 里同样不安全**：浏览器解析标签属性时会**先做 HTML 实体解码，再把结果交给 JS 引擎**。所以 `escapeAttr` 转出的 `&#39;` 会在解码时变回裸的 `'`，照样闭合字符串。`escapeAttr` 只在「属性值最终不再进入 JS 上下文」时才是对的（例如 `title=` / `data-*=`）。2026-10-04 已把 7 处内联实参（机器人切换、会话行/重命名/删除、历史搜索跳转、备份回滚/删除）全部改为 `escAttrJs`；新增内联事件时照此办理。

**验证方式**：`build_exe\test_secfix.js` 的判据不是「源码里有没有某个词」，而是**把转义结果嵌进 JS 单引号字面量里 `new Function` 求值**，看解析器会不会被骗过 —— 修复前 31 项红、修复后 66 项绿。`verify_exe_html.py` 另有 19 条形态断言守住 exe 内嵌副本不回退。

### 数据清理口径（改前必读）

「应急恢复」按 **`botcraft.` 前缀通配**删除，与「导出全部配置」的筛选口径完全一致（所见即所删）。早前它维护一份手写键名清单，结果和真实键名全面对不上：清单写 `botcraft.bots` 而真值是 `botcraft.bots.v2`，且窄正则漏掉 `botcraft.kb.*` / `snippets` / `reminders` / `usage` 等按用户隔离的键 —— 号称「清空全部数据」却把知识库正文留在原地。**新增存储键不需要再登记到任何清单里**，前缀通配会自动覆盖。

**存储**：一律走工具层，不要直接调 `localStorage.*`。直接调会绕过 `__storage` 安全层 —— 双击 `file://` 打开时部分浏览器禁用 `localStorage`，安全层会退化为内存 Map（本次会话仍可用），而裸调用会静默吞掉写入，用户表现为「保存了但关掉就没」。

**裸调 `localStorage` 的 4 类豁免**（都不是遗漏，改动时不要「顺手修正」）：

| 位置 | 用途 | 为什么必须裸调 |
| --- | --- | --- |
| `__storage` 自身（`3142-3150`） | 探测 localStorage 可用性 + 读写回退 | 它**就是**安全层，套自己会无限递归 |
| 沙箱自检探针（`5332`） | 在 iframe 源码字符串里探测 `parent.localStorage` 是否可达 | 目标是 `parent` 对象，不能用本页的封装 |
| 复制流程自观测（`17223` / `17276`） | 写 `botcraft.copyResult` 记录复制走通哪条路 | 探针不能影响被观测的主流程 |
| 第 4 块（`20106-20361`） | 独立诊断 / 右键复制块 | 刻意与主块零依赖，不能引用主块定义 |

前 3 类都是**只写探针**，不承载业务数据；第 4 类是块独立性约定（见第 5 批第 35 项）。

**门禁脚本的 node 路径**：已改为自动探测（`BC_NODE` 环境变量 → 按语义化版本取最新 → PATH）。若把门禁结果当作发布依据，请留意**没有 SKIP 项** —— 脚本找不到 node 会直接判 FAIL 而非跳过（静默跳过比失败危险）。

### 知识库模块命名约定

知识库子系统有 60+ 个 `kb` 前缀函数，三档前缀对应三种可见性，**下划线不是装饰**：

| 前缀 | 数量 | 语义 | 举例 |
| --- | --- | --- | --- |
| `_kbCsdn*` | 22 | CSDN 导入层内部 | `_kbCsdnHtmlToMd` / `_kbCsdnSliceTag` / `_kbCsdnKatexToTex` / `_kbCsdnFixFences` |
| `_kb*` | 22 | 通用知识库内部 | `_kbStripNoise` / `_kbParsePaste` / `_kbBeautifyBody` / `_kbIsCsdnText` |
| `kb*` | 19 | UI 入口，可被 `onclick` 直接调 | `kbById` / `kbSearch` / `kbInvalidate` |

新增函数先定档：只在 CSDN 导入路径用 → `_kbCsdn*`；通用知识库能力 → `_kb*`；需要挂到界面事件上 → `kb*`。

**一对近义名，不是特化关系**：`kbInvalidate(docId)` 删单篇文档的索引条目；`kbInvalidateCache()` 是给测试与外部清理用的包装，转调前者并兜 `try`。二者都要留着，不要合并 —— 前者按 id 精确失效，后者是幂等清空入口。

### 测试规模（`build_exe/`）

| 脚本 | 项数 | 覆盖 |
| --- | --- | --- |
| `test_csdn.js` | 97 | CSDN 三形态导入，末段反向断言非 CSDN 来源逐字不变 |
| `test_secfix.js` | 67 | 转义 / 导出字段 / 前缀清理 / 写盘失败上报 |
| `test_robust.js` | 74 | 超时取消、竞态守卫、幂等性、资源释放 |
| `test_perf.js` | 92 | 量化判据（尺寸缓存、rAF 合帧、查表、流式截断、LRU） |
| `verify_exe_html.py` | 924 条形态断言 | 守住 exe 内嵌副本不回退 |

规模数字随功能增长，**以实跑输出为准**，README 里的数字是快照而非契约。

### CSDN 文章兼容（知识库导入）

在「🔗 网址 / 粘贴导入」与「＋ 导入文档」里直接粘 CSDN 文章即可：网址、复制的正文、导出的 Markdown 三种形态都会自动识别，剥掉目录树 / 评论区 / 关注栏 / 投票区 / 侧栏 / 付费提示，保留标题层级、代码块（带语言标识）、图片、链接、引用、表格与列表。

实现集中在第 2 个 `<script>` 块 `_kbStripNoise` 之后的一段 CSDN 兼容层（约 730 行），三条入口各接一处：

| 入口 | 位置 | 作用 |
| --- | --- | --- |
| 网页抓取 | `_htmlToText()` 开头 | 识别为 CSDN 则改走 `_kbCsdnHtmlToMd()`（通用路径会丢图片、把表格压成一行） |
| 粘贴导入 | `_kbParsePaste()` 开头 | HTML 片段转 Markdown、Markdown 走清洗；**格式下拉框选什么都一样**（不该由用户操心来源） |
| 文件导入 | `importKbFile()` | CSDN 导出的 `.md` / 复制的 `.html` 同样过一遍 |

几个刻意的取舍：

- **判定必须有门槛**。`_kbIsCsdnText()` 要求 12 条指纹（`_KB_CSDN_MARKS`）里**命中 ≥2 条**才算 CSDN —— 单条太弱（`article_content`、`comment` 这类 class 到处都有）。无门槛套 CSDN 清洗会把普通来源也删一遍。
- **先取正文容器，再剥噪声**。反过来会踩坑：删掉嵌套噪声块后容器里会留下孤立 `</div>`，深度配平数到它就以为容器结束，正文被截断。
- **切片按标签深度配平**，不用「非贪婪扫到第一个闭合标签」。CSDN 正文里 div 套 div 是常态，后者只能拿到最外层几行。同理，删除区间取配平闭合标签的**起点**，不用「总长 − 内容长度」倒推（长度反推会错位，实测把整个代码块连同其后正文删掉）。
- **公式保留 LaTeX 源码**。正文不引 MathJax/KaTeX（体积大 + 离线渲染不了），但源码对检索和模型都有用：块级 `$$…$$` → ```` ```math ```` 围栏，行内 → 行内代码。KaTeX 页面从 `<annotation encoding="application/x-tex">` 里取源码（**必须先取再剥 MathML**，annotation 在它内部）。
- **乱码只修可逆的那类**。UTF-8 字节被当 latin1 读是可逆的，按 windows-1252 反查回字节后重解（`0x80–0x9F` 有可打印映射，直接 `& 0xFF` 会让字节序列错位）；GBK 误解码不可逆，只清 `U+FFFD` 不硬猜 —— 改错比不改更糟。
- **未闭合代码围栏必须补齐**。按 CommonMark，不闭合的 ` ``` ` 会把后面整篇正文吞进代码块，分块检索与广告清洗的口径一起失真。
- 语言标识**只做安全兜底不改名**（拦引号 / 尖括号），`py` 就还是 `py` —— 渲染层本来两种都认，归一反而让复制出去的代码块变了样。

测试见 `build_exe/test_csdn.js`（97 项，末段反向断言非 CSDN 来源的解析结果逐字不变）。
## 许可证

MIT License — 见 [LICENSE](LICENSE)。
