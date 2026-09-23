// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/notify ===== */ 标记的段落。
function _notifySupported() {
  try { return (typeof Notification !== 'undefined') && Notification; } catch (e) { return null; }
}
// 桌面壳判定：桌面版通知走 Python 后端（bc_notify 直接投递 Windows toast），
// 不碰 Web Notification —— WebView2 对通知权限默认拒绝/挂起，页面的
// requestPermission() 永远不 resolve，按钮看起来「无响应」（2026-09-23 实测根因）。
function _isDesktop() {
  try { return !!(window.__BC_HOST_STORAGE__ && window.pywebview && window.pywebview.api); } catch (e) { return false; }
}
function setNotifyState(txt) {
  var el = document.getElementById('notifyState');
  if (el) el.textContent = txt;
}
function notifyStateText() {
  if (_isDesktop()) return '桌面壳通知：到点由 BotCraft 直接投递 Windows 系统通知（应用在后台也能收到），可点右侧按钮发一条测试';
  var N = _notifySupported();
  if (!N) return '当前环境不支持系统通知，到点将在应用内提示（请保持窗口可见）';
  if (N.permission === 'granted') return '系统通知已开启：到点会在桌面右下角弹出，应用在后台也能收到';
  if (N.permission === 'denied') return '系统通知被拒绝：到点只能在应用内提示（可在系统设置里为 BotCraft 重新允许通知）';
  return '尚未开启系统通知：到点只在应用内提示，点右侧按钮开启系统通知';
}
function askNotificationPermission() {
  // 桌面版：通知由 Python 后端直投，点按钮发一条测试通知让用户立刻看到效果
  if (_isDesktop()) {
    var hostApi = (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
    if (!(hostApi && typeof hostApi.bc_notify === 'function')) {
      setNotifyState('桌面壳通知接口不可用（请更新到最新版），到点将在应用内提示');
      return;
    }
    setNotifyState('正在发送测试通知…');
    Promise.resolve(hostApi.bc_notify('⏰ BotCraft', '通知通道已打通：日程到点会这样弹出系统提醒'))
      .then(function (r) {
        setNotifyState((r && r.ok) ? '桌面壳通知已可用（刚才那条就是到点时的效果）' : '桌面壳通知发送失败，到点将在应用内提示');
        try { renderRemindersInModal(); } catch (eM) { } // 面板未打开时该函数不存在，别让它毁了结果反馈
      })
      .catch(function () { setNotifyState('桌面壳通知发送失败，到点将在应用内提示'); });
    return;
  }
  var N = _notifySupported();
  if (!N) { toast('当前环境不支持系统通知', 'warn'); return; }
  try {
    var p = N.requestPermission();
    if (p && p.then) {
      p.then(function () { toast(notifyStateText(), 'ok', 5000); renderRemindersInModal(); })
        .catch(function () { toast('申请系统通知失败，可稍后再试', 'err'); });
    } else {
      toast(notifyStateText(), 'ok', 5000); renderRemindersInModal();
    }
  } catch (e) { toast('申请系统通知失败：' + ((e && e.message) || e), 'err'); }
}
function notifyReminder(title) {
  var text = String(title || '');
  // 桌面版：优先由 Python 后端直投 Windows toast（不依赖 Web Notification 权限）
  if (_isDesktop()) {
    try {
      var hostApi = (window.pywebview && window.pywebview.api) ? window.pywebview.api : null;
      if (hostApi && typeof hostApi.bc_notify === 'function') {
        Promise.resolve(hostApi.bc_notify('⏰ BotCraft 提醒', text)).catch(function () { });
        return 'system';
      }
    } catch (eD) { }
  }
  var N = _notifySupported();
  var fallback = function () { try { toast('⏰ 提醒：' + text, 'ok', 7000); } catch (e) { } };
  if (!N) { fallback(); return 'toast'; }
  try {
    if (N.permission === 'granted') {
      try { new Notification('⏰ BotCraft 提醒', { body: text, tag: 'bc-remind' }); return 'system'; }
      catch (e) { fallback(); return 'toast'; }
    }
    if (N.permission === 'default') {
      // 首次到点顺手申请授权：无论用户怎么选，**应用内提示都照发**，不让提醒落空
      try {
        var r = N.requestPermission();
        if (r && r.then) {
          r.then(function (st) {
            if (st === 'granted') { try { new Notification('⏰ BotCraft 提醒', { body: text, tag: 'bc-remind' }); } catch (e) { } }
          }).catch(function () { });
        }
      } catch (e) { }
      fallback();
      return 'toast+ask';
    }
  } catch (e) { }
  fallback();
  return 'toast';
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    _notifySupported: typeof _notifySupported !== "undefined" ? _notifySupported : undefined,
    _isDesktop: typeof _isDesktop !== "undefined" ? _isDesktop : undefined,
    setNotifyState: typeof setNotifyState !== "undefined" ? setNotifyState : undefined,
    notifyStateText: typeof notifyStateText !== "undefined" ? notifyStateText : undefined,
    notifyReminder: typeof notifyReminder !== "undefined" ? notifyReminder : undefined,
    askNotificationPermission: typeof askNotificationPermission !== "undefined" ? askNotificationPermission : undefined,
    manualCheckUpdate: typeof manualCheckUpdate !== "undefined" ? manualCheckUpdate : undefined,
  };
}
