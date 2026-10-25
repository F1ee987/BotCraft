// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/fbdiagnose ===== */ 标记的段落。
// P2-1 满意度数据行动闭环：collectFeedback() 只汇总「现状」（赞/踩/按机器人/按模型），
// 但用户看到数字不知道「该改什么」。这里把数字落成可执行建议：哪个维度异常 → 该改哪。
// fb = collectFeedback() 形态；usage = getUsage() 形态（totals.fb = 降级调用数）。
var FB_DIAG_MIN = 10;       // 总评价样本低于这个数，不下结论（避免一两票的噪声）
var FB_DIAG_LOW = 70;       // 整体好评率低于此视为偏低
var FB_DIAG_BOT_LOW = 60;   // 单机器人/模型好评率低于此且样本足够，单独点名
var FB_DIAG_FB_RATE = 0.3;  // 降级率（降级调用/总调用）高于此提示查主模型额度
/* 好评率百分比（up / (up+down)）。**样本为 0 时返回 null**，调用方自己保证分母>0。
   2026-10-19 审计时它是「零引用死代码」，同一段 `Math.round(up/n*100)` 却在下面
   手写了三遍（整体 / 按机器人 / 按模型）。2026-10-25 反向收口：让它成为唯一实现，
   三处调用点都改成 satPctOf(...) —— 既没有死代码，也不会再有一处漏改（比如将来
   要改成保留一位小数，只需动这里）。 */
function satPctOf(o) {
  var n = (o && ((o.up || 0) + (o.down || 0))) || 0;
  return n ? Math.round((o.up || 0) / n * 100) : null;
}
function diagnoseFeedback(fb, usage) {
  var out = [];
  if (!fb) return out;
  var up = fb.up || 0, down = fb.down || 0, total = up + down;
  if (total < FB_DIAG_MIN) {
    out.push({ level: 'info', dim: '样本', text: '评价样本不足（' + total + '/' + FB_DIAG_MIN + '），继续在对话里点「有用 / 没用」收集即可', action: '暂无' });
    return out;
  }
  var pct = satPctOf(fb);
  if (pct < FB_DIAG_LOW) out.push({ level: 'warn', dim: '整体满意度', text: '整体好评率 ' + pct + '% 偏低', action: '检查全局提示词，给机器人补充知识库，或换更稳的模型' });
  else out.push({ level: 'ok', dim: '整体满意度', text: '整体好评率 ' + pct + '%，表现健康', action: '保持' });
  Object.keys(fb.byBot || {}).forEach(function (nm) {
    var o = fb.byBot[nm], n = (o.up || 0) + (o.down || 0);
    if (n >= 5) {
      var bp = satPctOf(o);
      if (bp < FB_DIAG_BOT_LOW) out.push({ level: 'warn', dim: '机器人', text: '「' + nm + '」好评率 ' + bp + '%（' + n + ' 次）偏低', action: '优化该机器人的提示词与知识库' });
    }
  });
  Object.keys(fb.byModel || {}).forEach(function (mk) {
    var o = fb.byModel[mk], n = (o.up || 0) + (o.down || 0);
    if (n >= 5) {
      var mp = satPctOf(o);
      if (mp < FB_DIAG_BOT_LOW) out.push({ level: 'warn', dim: '模型', text: '模型 ' + mk + ' 好评率 ' + mp + '%（' + n + ' 次）偏低', action: '考虑在备用链里优先或更换主模型' });
    }
  });
  var calls = (usage && usage.totals && usage.totals.calls) || 0;
  var fbCalls = (usage && usage.totals && usage.totals.fb) || 0;
  if (calls > 20 && fbCalls / calls > FB_DIAG_FB_RATE) {
    out.push({ level: 'warn', dim: '降级率', text: '降级调用占比 ' + Math.round(fbCalls / calls * 100) + '%，主模型可能额度不足', action: '检查主模型配额，或在「备用模型链」补强' });
  }
  return out;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    diagnoseFeedback: typeof diagnoseFeedback !== "undefined" ? diagnoseFeedback : undefined,
  };
}
