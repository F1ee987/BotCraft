// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/sessusage ===== */ 标记的段落。
/* 单会话（一个机器人的一条 session）的 Token 用量与费用。
   挂在会话对象上（s.usage），随机器人一起落盘 —— 隔离靠的是「对象本身」而不是机器人**名字**
   这类会变的键：此前全局统计只有按机器人名聚合一档，改名即丢统计，且一个机器人多条会话时
   全糊在一起，看不出是哪条会话烧的钱。
   cost 不累加、每次从 models 明细按 priceOf 重算：单价表会变（新增模型 / 调价），累加值会
   悄悄漂成旧价，重算则永远与当前口径一致。models 明细也让「这条会话分别用了哪些模型」可查。 */
function coerceSessionUsage(u) {
  var r = { calls: 0, pt: 0, ct: 0, est: 0, cost: 0, models: {} };
  if (!u || typeof u !== 'object') return r;
  r.calls = Math.max(0, Math.round(Number(u.calls) || 0));
  r.pt = Math.max(0, Math.round(Number(u.pt) || 0));
  r.ct = Math.max(0, Math.round(Number(u.ct) || 0));
  r.est = Math.max(0, Math.round(Number(u.est) || 0));
  r.cost = Math.max(0, Number(u.cost) || 0);
  if (u.models && typeof u.models === 'object') {
    Object.keys(u.models).forEach(function (k) {
      var m = u.models[k];
      if (!m || typeof m !== 'object') return;
      var pt = Math.max(0, Math.round(Number(m.pt) || 0));
      var ct = Math.max(0, Math.round(Number(m.ct) || 0));
      // 0/0 的档位是噪声：既不含信息，又会让 Object.keys 无谓增长
      if (pt || ct) r.models[k] = { pt: pt, ct: ct };
    });
  }
  return r;
}
// priceOf 由调用方注入（应用层的 PRICE_TABLE），模块本身不依赖任何全局 —— 保持可单测。
function sessionUsageCost(u, priceOf) {
  var c = (u && u.models) ? u : coerceSessionUsage(u), sum = 0;
  Object.keys(c.models).forEach(function (k) {
    var p = (typeof priceOf === 'function') ? priceOf(k) : null;
    var pi = (p && p.length) ? (Number(p[0]) || 0) : 0;
    var po = (p && p.length) ? (Number(p[1]) || 0) : 0;
    sum += c.models[k].pt / 1e6 * pi + c.models[k].ct / 1e6 * po;
  });
  return sum > 0 ? sum : 0;
}
function sessionUsageSummary(u, priceOf) {
  var c = coerceSessionUsage(u);
  return {
    calls: c.calls, pt: c.pt, ct: c.ct, tokens: c.pt + c.ct, est: c.est,
    cost: sessionUsageCost(c, priceOf)
  };
}
// 返回**新**对象（不改传入的旧对象）：调用方直接赋值回 s.usage，无需关心浅拷贝/别名问题。
function addSessionUsage(u, model, pt, ct, isEst, priceOf) {
  var c = coerceSessionUsage(u);
  pt = Math.max(0, Math.round(Number(pt) || 0));
  ct = Math.max(0, Math.round(Number(ct) || 0));
  if (!pt && !ct) return c;   // 没有用量就不建档位、不涨调用数
  c.calls += 1;
  c.pt += pt;
  c.ct += ct;
  if (isEst) c.est += 1;
  var mk = String(model || '').trim() || '未知模型';
  if (!c.models[mk]) c.models[mk] = { pt: 0, ct: 0 };
  c.models[mk].pt += pt;
  c.models[mk].ct += ct;
  c.cost = sessionUsageCost(c, priceOf);
  return c;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    coerceSessionUsage: typeof coerceSessionUsage !== "undefined" ? coerceSessionUsage : undefined,
    sessionUsageCost: typeof sessionUsageCost !== "undefined" ? sessionUsageCost : undefined,
    sessionUsageSummary: typeof sessionUsageSummary !== "undefined" ? sessionUsageSummary : undefined,
    addSessionUsage: typeof addSessionUsage !== "undefined" ? addSessionUsage : undefined,
  };
}
