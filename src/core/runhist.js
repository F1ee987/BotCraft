// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/runhist ===== */ 标记的段落。
// N5 运行历史可观测性：P0-3 的运行历史上限 100 条、无筛选——计划/Webhook 一多，
// 「上周那个失败的日报」基本翻不到。过滤与 CSV 导出都是纯函数，镜像供单测。
function filterRunHistory(hist, filter) {
  if (!Array.isArray(hist)) return [];
  var f = filter || 'all';
  return hist.filter(function (e) {
    if (f === 'fail') return e && e.ok === false;
    if (f === 'schedule') return e && e.source !== 'webhook';
    if (f === 'webhook') return e && e.source === 'webhook';
    return true;
  });
}
function runHistoryCsv(hist) {
  var rows = [['时间', '来源', '名称', '机器人', '状态', '耗时ms', '产出字数', '错误']];
  (hist || []).forEach(function (e) {
    rows.push([
      e.ts ? new Date(e.ts).toLocaleString('zh-CN') : '',
      e.source === 'webhook' ? 'Webhook' : '计划',
      String(e.schName || ''),
      String(e.botName || ''),
      e.ok ? '成功' : '失败',
      String(e.ms || 0),
      String(e.finalLen || 0),
      String(e.err || '')
    ]);
  });
  // CSV 转义：含逗号 / 引号 / 换行 / 前后空白的字段用双引号包裹，内部引号翻倍。
  // 不转义的解释器（Excel 中文环境常见）会把一个含逗号的备注撑成两列。
  return '\uFEFF' + rows.map(function (r) {
    return r.map(function (c) {
      c = String(c);
      return (/[",\n\r]|^\s|\s$/.test(c)) ? '"' + c.replace(/"/g, '""') + '"' : c;
    }).join(',');
  }).join('\r\n');
}
function runHistoryCsvName() {
  var d = new Date();
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return 'botcraft-run-history-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate())
    + '-' + p(d.getHours()) + p(d.getMinutes()) + '.csv';
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    filterRunHistory: typeof filterRunHistory !== "undefined" ? filterRunHistory : undefined,
    runHistoryCsv: typeof runHistoryCsv !== "undefined" ? runHistoryCsv : undefined,
    runHistoryCsvName: typeof runHistoryCsvName !== "undefined" ? runHistoryCsvName : undefined,
  };
}
