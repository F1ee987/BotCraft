// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/webhook ===== */ 标记的段落。
// 本地入站 API（Webhook）的纯路由判定。桌面版 Python 侧起 loopback HTTP 服务，把「/wh/<token>」
// 路由到指定机器人并触发其工作流；本 MODULE 只负责「token 怎么生成 / 记录怎么规整 / 怎么匹配」，
// 不碰 DOM、不发请求，导出到 src/core/webhook.js 镜像供单测真跑。触发与 UI 在 HTML 本体。
function _whRandBytes(n) {
  try {
    var c = (typeof crypto !== 'undefined' && crypto) ? crypto : null;
    if (c && c.getRandomValues) {
      var b = new Uint8Array(n);
      c.getRandomValues(b);
      return b;
    }
  } catch (e) {}
  var out = [];
  for (var i = 0; i < n; i++) out.push(Math.floor(Math.random() * 256));
  return out;
}
function genWebhookToken() {
  var b = _whRandBytes(18), s = '';
  for (var i = 0; i < b.length; i++) s += (b[i] & 0xff).toString(16).padStart(2, '0');
  return s;
}
function coerceWebhook(o) {
  o = o || {};
  var id = (typeof o.id === 'string' && o.id) ? o.id : ('wh_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  var token = (typeof o.token === 'string' && /^[A-Za-z0-9]{8,}$/.test(o.token)) ? o.token : genWebhookToken();
  var name = (typeof o.name === 'string') ? o.name.slice(0, 80) : '';
  var botId = (typeof o.botId === 'string') ? o.botId : '';
  var enabled = o.enabled !== false;
  var note = (typeof o.note === 'string') ? o.note.slice(0, 200) : '';
  var createdAt = (typeof o.createdAt === 'number' && o.createdAt) ? o.createdAt : Date.now();
  var lastRun = (typeof o.lastRun === 'number' && o.lastRun) ? o.lastRun : 0;
  var lastStatus = (o.lastStatus === 'ok' || o.lastStatus === 'err') ? o.lastStatus : '';
  var lastError = (typeof o.lastError === 'string') ? o.lastError.slice(0, 300) : '';
  return { id: id, token: token, name: name, botId: botId, enabled: enabled, note: note,
    createdAt: createdAt, lastRun: lastRun, lastStatus: lastStatus, lastError: lastError };
}
function matchWebhook(routes, token) {
  if (!Array.isArray(routes) || !token) return null;
  for (var i = 0; i < routes.length; i++) {
    var r = routes[i];
    if (r && r.token === token && r.enabled) return r;
  }
  return null;
}
function genWebhookUrl(host, port, token) {
  host = host || '127.0.0.1';
  port = (typeof port === 'number' && port > 0) ? port : 0;
  return 'http://' + host + ':' + port + '/wh/' + (token || '');
}
function defaultWebhook(botId) {
  return coerceWebhook({ botId: botId || '', name: '新建 Webhook', enabled: true });
}
function coerceWebhookList(arr) {
  return Array.isArray(arr) ? arr.map(coerceWebhook) : [];
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    genWebhookToken: typeof genWebhookToken !== "undefined" ? genWebhookToken : undefined,
    coerceWebhook: typeof coerceWebhook !== "undefined" ? coerceWebhook : undefined,
    matchWebhook: typeof matchWebhook !== "undefined" ? matchWebhook : undefined,
    genWebhookUrl: typeof genWebhookUrl !== "undefined" ? genWebhookUrl : undefined,
    defaultWebhook: typeof defaultWebhook !== "undefined" ? defaultWebhook : undefined,
    coerceWebhookList: typeof coerceWebhookList !== "undefined" ? coerceWebhookList : undefined,
  };
}
