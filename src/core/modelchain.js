// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/modelchain ===== */ 标记的段落。
// P1-4 模型自动降级：主模型瞬态失败时按备用链切换「真·备用模型」，而不是直接掉
// 「演示回复」（README 明列 429 是高频痛点）。判定与规整都是纯函数，镜像供单测。
// 降级边界：网络失败 / 408 / 409 / 429 / 5xx 值得换；401/403/400 不换（Key 错、
// 参数错，换了也白换）；AbortError 是用户主动停；EmptyOutputError 是主模型能通
// 但正文被思考吃光，换模型治不了。
function isDegradable(e) {
  if (!e) return false;
  if (e.name === 'AbortError') return false;
  if (e.name === 'EmptyOutputError') return false;
  if (e.isNetwork) return true;
  var s = e.status ? Number(e.status) : 0;
  if (!s) return false;
  if (s === 429 || s === 408 || s === 409) return true;
  if (s >= 500 && s < 600) return true;
  return false;
}
function coerceModelChain(arr) {
  if (!Array.isArray(arr)) return [];
  var out = [];
  for (var i = 0; i < arr.length && out.length < 5; i++) {
    var it = arr[i] || {};
    var baseURL = (typeof it.baseURL === 'string') ? it.baseURL.trim().slice(0, 300) : '';
    var model = (typeof it.model === 'string') ? it.model.trim().slice(0, 120) : '';
    if (!baseURL || !model) continue;          // 缺接口或模型就没法调，剔除
    var apiKey = (typeof it.apiKey === 'string') ? it.apiKey.trim().slice(0, 300) : '';
    var label = (typeof it.label === 'string') ? it.label.trim().slice(0, 40) : '';
    out.push({ label: label || model, baseURL: baseURL, apiKey: apiKey, model: model });
  }
  return out;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    isDegradable: typeof isDegradable !== "undefined" ? isDegradable : undefined,
    coerceModelChain: typeof coerceModelChain !== "undefined" ? coerceModelChain : undefined,
  };
}
