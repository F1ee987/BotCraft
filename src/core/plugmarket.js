// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/plugmarket ===== */ 标记的段落。
// P2-3 插件版本管理与市场：清单带 version（语义化 x.y.z）；已装插件与「发现插件」里的
// 远程清单比对版本号，判断是否有更新。比对是纯函数，UI 用桌面版 bc_http 拉取远程清单、
// 浏览器版提示「检查更新需桌面版」。
function _splitVer(v) {
  if (typeof v !== 'string') return null;
  var m = v.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}
function cmpVersion(a, b) {
  var xa = _splitVer(a), xb = _splitVer(b);
  if (!xa || !xb) return null;
  for (var i = 0; i < 3; i++) {
    if (xa[i] !== xb[i]) return xa[i] < xb[i] ? -1 : 1;
  }
  return 0;
}
function checkPluginUpdate(installed, remote) {
  if (!installed || !remote) return 'unknown';
  var c = cmpVersion(installed.version, remote.version);
  if (c === null) return 'unknown';
  if (c >= 0) return 'none';
  var xi = _splitVer(installed.version), xr = _splitVer(remote.version);
  if (!xi || !xr) return 'minor';
  if (xr[0] > xi[0]) return 'major';
  return 'minor';
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    cmpVersion: typeof cmpVersion !== "undefined" ? cmpVersion : undefined,
    checkPluginUpdate: typeof checkPluginUpdate !== "undefined" ? checkPluginUpdate : undefined,
  };
}
