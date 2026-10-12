// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/schedule ===== */ 标记的段落。
// P0-3 定时 / 触发运行（2026-10-12 第三轮）。
// 纯函数：只吃参数、不碰 DOM / 存储 / 全局状态，前端调度循环与 Node 单测共用同一套逻辑。
// 调度策略（MVP，面向「应用开着即生效」）：
//   · interval：每 N 分钟一次（N∈[1,43200]）；
//   · daily   ：每天固定时刻（HH:MM）；
//   · hourly   ：每小时第 N 分（N∈[0,59]）。
// 跨「页面最小化被浏览器降频」的常驻进程调度属后续升级（后端 resident 服务），本轮先把
// 应用开启期内的触发 + 开机补跑做对、做稳、可观测。

function coerceSchedule(o) {
  o = (o && typeof o === 'object') ? o : {};
  var mode = (o.mode === 'daily' || o.mode === 'hourly' || o.mode === 'interval') ? o.mode : 'interval';
  var every = Number(o.every);
  if (!isFinite(every) || every <= 0) every = 60;
  every = Math.min(Math.max(Math.round(every), 1), 60 * 24 * 30);
  var at = (o.at == null ? '' : String(o.at));
  if (mode === 'daily') {
    var dm = String(at).match(/^(\d{1,2}):(\d{2})$/);
    if (!dm || parseInt(dm[1], 10) > 23 || parseInt(dm[2], 10) > 59) at = '09:00';
  } else if (mode === 'hourly') {
    var hmn = Number(at);
    if (!isFinite(hmn) || hmn < 0 || hmn > 59) hmn = 0;
    at = String(Math.min(59, Math.max(0, Math.round(hmn))));
  } else {
    at = '';
  }
  return {
    id: o.id || ('sch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
    botId: String(o.botId || ''),
    name: String(o.name || '').slice(0, 80),
    enabled: o.enabled !== false,
    mode: mode,
    every: every,
    at: at,
    input: String(o.input == null ? '' : o.input),
    createdAt: Number(o.createdAt) || Date.now(),
    lastRun: Number(o.lastRun) || 0,
    lastStatus: o.lastStatus || null,
    lastError: String(o.lastError == null ? '' : o.lastError).slice(0, 300)
  };
}

// 算出「现在该不该触发」。返回 { due, nextAt, reason }。
//   disabled / 无 botId → 永不触发；
//   interval：now - lastRun >= every*60000（lastRun=0 视为从未跑过 → 立即到期）；
//   daily    ：now 已过今天 at 且上次运行在今天的 at 之前 → 到期（nextAt 指向下一个 at）；
//   hourly   ：now 已过本小时 at 分且上次在它之前 → 到期（nextAt 指向下一个整点 at 分）。
function evalScheduleDue(sch, nowMs, lastRunMs) {
  sch = coerceSchedule(sch);
  if (!sch.enabled) return { due: false, nextAt: 0, reason: 'disabled' };
  if (!sch.botId) return { due: false, nextAt: 0, reason: 'no-bot' };
  var now = Number(nowMs) || Date.now();
  var last = Number(lastRunMs);
  if (!isFinite(last) || last <= 0) last = Number(sch.lastRun) || 0;
  if (sch.mode === 'interval') {
    var iv = sch.every * 60000;
    if (!last) return { due: true, nextAt: now + iv, reason: 'never-ran' };
    if (now - last >= iv) return { due: true, nextAt: now + iv, reason: 'interval-elapsed' };
    return { due: false, nextAt: last + iv, reason: 'interval-wait' };
  }
  if (sch.mode === 'daily') {
    var d = _schClock(sch.at);
    var next = _schNextDailyAt(now, d.h, d.m);
    if (!last) return { due: true, nextAt: next, reason: 'never-ran' };
    var todayAt = _schTodayAt(now, d.h, d.m);
    if (now >= todayAt && last < todayAt) return { due: true, nextAt: next, reason: 'daily-due' };
    return { due: false, nextAt: next, reason: 'daily-wait' };
  }
  var hmn2 = Number(sch.at) || 0;
  var nextH = _schNextHourlyAt(now, hmn2);
  if (!last) return { due: true, nextAt: nextH, reason: 'never-ran' };
  var thisHourAt = _schThisHourAt(now, hmn2);
  if (now >= thisHourAt && last < thisHourAt) return { due: true, nextAt: nextH, reason: 'hourly-due' };
  return { due: false, nextAt: nextH, reason: 'hourly-wait' };
}

function nextDueAt(sch, nowMs) {
  return evalScheduleDue(sch, nowMs, Number(sch.lastRun) || 0).nextAt;
}

function defaultSchedule(botId) {
  return coerceSchedule({ botId: botId || '', name: '新建计划', enabled: true, mode: 'interval', every: 60, at: '', input: '' });
}

// 时钟工具：全部用本地 Date 的时分计算，避免 Date.parse 的时区差异。
function _schClock(s) {
  var m = String(s || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return { h: 9, m: 0 };
  return { h: Math.min(23, Math.max(0, parseInt(m[1], 10))), m: Math.min(59, Math.max(0, parseInt(m[2], 10))) };
}
function _schTodayAt(now, h, m) { var d = new Date(now); d.setHours(h, m, 0, 0); return d.getTime(); }
function _schNextDailyAt(now, h, m) {
  var t = _schTodayAt(now, h, m);
  if (t <= now) { var d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(h, m, 0, 0); t = d.getTime(); }
  return t;
}
function _schThisHourAt(now, mn) { var d = new Date(now); d.setMinutes(mn, 0, 0); return d.getTime(); }
function _schNextHourlyAt(now, mn) {
  var t = _schThisHourAt(now, mn);
  if (t <= now) { var d = new Date(now); d.setHours(d.getHours() + 1, mn, 0, 0); t = d.getTime(); }
  return t;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    evalScheduleDue: typeof evalScheduleDue !== "undefined" ? evalScheduleDue : undefined,
    nextDueAt: typeof nextDueAt !== "undefined" ? nextDueAt : undefined,
    coerceSchedule: typeof coerceSchedule !== "undefined" ? coerceSchedule : undefined,
    defaultSchedule: typeof defaultSchedule !== "undefined" ? defaultSchedule : undefined,
  };
}
