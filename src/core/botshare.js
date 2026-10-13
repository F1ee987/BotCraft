// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/botshare ===== */ 标记的段落。
// P1-2 单机器人分享：把单个机器人（配置+工作流+知识库引用+插件+提示词）打包成一份
// .bot.json，可单独发给别人导入；历史默认不带（体积+隐私）。冲突检测结果由 UI 据此弹
// 「保留现有 / 覆盖 / 两者都留」让用户选，applyBotImport 落最终合并。
function _cloneShareBot(b) {
  try { return structuredClone(b || {}); } catch (e) { return {}; }
}
function _newBotId() {
  return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function buildBotShare(bot, opts) {
  opts = opts || {};
  if (!bot) return null;
  var b = {};
  ['n', 'd', 'c', 'tag', 'model', 'prompt', 'expertise', 'temperature'].forEach(function (k) {
    if (bot[k] !== undefined) b[k] = bot[k];
  });
  b.nodes = Array.isArray(bot.nodes) ? bot.nodes : [];
  b.edges = Array.isArray(bot.edges) ? bot.edges : [];
  b.knowledges = Array.isArray(bot.knowledges)
    ? bot.knowledges.map(function (k) {
        var id = (k && k.id) ? k.id : k;
        if (opts.resolveKb) {
          var kb = opts.resolveKb(id);
          if (kb) return { id: id, name: kb.name, content: kb.content };
        }
        return { id: id, name: (k && k.name) ? k.name : id };
      })
    : [];
  b.plugins = Array.isArray(bot.plugins) ? bot.plugins.slice() : [];
  var out = {
    app: 'BotCraft', kind: 'bot', version: 1,
    exportedAt: new Date().toISOString(),
    note: 'BotCraft 单机器人分享文件。导入后需在本机为该模型配置 API Key。',
    bot: b, includesHistory: !!opts.includeHistory
  };
  if (opts.includeHistory && Array.isArray(bot.history)) out.bot.history = bot.history;
  return out;
}
function detectImportConflict(existing, incoming) {
  if (!Array.isArray(existing) || !incoming || !incoming.bot) return { conflict: null };
  var bot = incoming.bot;
  for (var i = 0; i < existing.length; i++) {
    if (bot.id && existing[i].id === bot.id) return { conflict: 'id', existingId: existing[i].id };
    if (bot.n && existing[i].n === bot.n) return { conflict: 'name', existingId: existing[i].id };
  }
  return { conflict: null };
}
function applyBotImport(existing, incoming, decision) {
  if (!incoming || !incoming.bot) return { bots: existing.slice(), bot: null };
  var bot = incoming.bot, arr = existing.slice(), c, i, nb;
  if (decision === 'replace') {
    c = detectImportConflict(arr, incoming);
    if (!c.existingId) return applyBotImport(arr, incoming, 'add');
    for (i = 0; i < arr.length; i++) {
      if (arr[i].id === c.existingId) {
        nb = _cloneShareBot(bot); nb.id = c.existingId;
        nb.createdAt = arr[i].createdAt || Date.now(); nb.updatedAt = Date.now();
        arr[i] = nb; break;
      }
    }
    return { bots: arr, bot: nb };
  }
  nb = _cloneShareBot(bot); delete nb.id; nb.id = _newBotId();
  nb.createdAt = Date.now(); nb.updatedAt = Date.now();
  if (decision === 'rename') nb.n = (bot.n || '机器人') + ' (导入)';
  arr.push(nb);
  return { bots: arr, bot: nb };
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    buildBotShare: typeof buildBotShare !== "undefined" ? buildBotShare : undefined,
    detectImportConflict: typeof detectImportConflict !== "undefined" ? detectImportConflict : undefined,
    applyBotImport: typeof applyBotImport !== "undefined" ? applyBotImport : undefined,
  };
}
