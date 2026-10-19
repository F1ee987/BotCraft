// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/update ===== */ 标记的段落。
var BC_BUILD_COMMIT = '__BC_BUILD_COMMIT__';
// 构建期由 build_exe.py 从源码的 APP_VERSION 注入（与 Release tag 同源）。
// 浏览器直开时占位符不被替换 → 非语义化版本串 → 更新检查自动跳过。
var BC_BUILD_VERSION = '__BC_BUILD_VERSION__';
function setUpdateStatus(txt) {
  var el = document.getElementById('updateCheckStatus');
  if (el) el.textContent = txt;
}
function setUpdateStatusHTML(html) {
  var el = document.getElementById('updateCheckStatus');
  if (el) el.innerHTML = html;   // 内容均为本文件拼接的固定文案 + hex 指纹，无外部输入
}
/* ============ N3：桌面版专属功能的降级引导（2026-10-19） ============
   背景（新功能开发建议-2026-10-13 的 N3）：浏览器版遇到桌面专属能力（本地服务 /
   本机执行器 / 本机备份 / Python 运行）时只显示一句「需桌面版」，那是死路 ——
   用户不知道去哪拿、也不知道拿到之后能多出什么。这里统一成一张引导卡：
   能力说明 + 怎么获得（下载桌面版）+ 已经装了桌面版时的辨认提示。 */
function bcIsDesktop() {
  return !!(window.pywebview && window.pywebview.api);
}
/* ---------- 界面设置 · 导出位置（2026-10-19） ---------- */
function _exportDirEl() { return document.getElementById('exportDirInput'); }
function refreshExportDirUI() {
  var el = _exportDirEl(), btn = document.getElementById('exportDirPickBtn');
  var guide = document.getElementById('exportDirGuide');
  var api = window.pywebview && window.pywebview.api;
  var supported = !!(api && api.bc_export_dir);
  if (btn) btn.disabled = !supported;
  if (guide) {
    guide.innerHTML = supported ? '' : desktopOnlyCard(
      '导出位置需要在桌面版设置',
      '浏览器版没有本机文件写入能力，导出会交给浏览器下载器，保存位置由浏览器决定；桌面版可以直接指定目录并回显真实路径。',
      '桌面版可用：指定导出目录、本机任务执行器等本机能力。'
    );
  }
  if (!supported) {
    if (el) el.value = '（浏览器版：由浏览器下载设置决定）';
    return Promise.resolve(false);
  }
  return Promise.resolve(api.bc_export_dir()).then(function (r) {
    if (el) el.value = (r && r.ok) ? (r.dir + (r.custom ? '' : '（默认）')) : '（读取失败）';
  }, function () { if (el) el.value = '（读取失败）'; });
}
function pickExportDir() {
  var api = window.pywebview && window.pywebview.api;
  if (!api || !api.bc_pick_export_dir) {
    toast('浏览器版无法选择导出目录，请使用桌面版', 'warn');
    return;
  }
  Promise.resolve(api.bc_pick_export_dir()).then(function (r) {
    if (r && r.ok) { toast('导出位置已改为 ' + _shortPath(r.dir), 'ok', 5000); }
    else if (r && r.canceled) { /* 用户取消，不打扰 */ }
    else { toast('设置失败：' + ((r && r.err) || '未知原因'), 'err'); }
    refreshExportDirUI();
  });
}
function resetExportDir() {
  var api = window.pywebview && window.pywebview.api;
  if (!api || !api.bc_reset_export_dir) { toast('浏览器版无需设置', 'warn'); return; }
  Promise.resolve(api.bc_reset_export_dir()).then(function (r) {
    toast('已恢复默认导出位置' + (r && r.dir ? '：' + _shortPath(r.dir) : ''), 'ok');
    refreshExportDirUI();
  });
}
window.refreshExportDirUI = refreshExportDirUI;
window.pickExportDir = pickExportDir;
window.resetExportDir = resetExportDir;

function openDownloadPage() {
  var url = 'https://github.com/F1ee987/BotCraft/releases/latest';
  var api = window.pywebview && window.pywebview.api;
  if (api && api.bc_open_url) {
    Promise.resolve(api.bc_open_url(url)).then(function (r) {
      if (!(r && r.ok)) toast('打开浏览器失败，请手动访问 GitHub Releases', 'err');
    }, function () { toast('打开浏览器失败，请手动访问 GitHub Releases', 'err'); });
    return;
  }
  // 浏览器版：window.open 可用（桌面壳里不可靠，已在上面走桥接）
  var w = window.open(url, '_blank', 'noopener');
  if (!w) toast('浏览器拦截了弹窗，请手动访问 GitHub Releases', 'warn');
}
function desktopOnlyCard(title, what, how) {
  return '<div class="dl-card">'
    + '<div class="dl-card-h">' + svgIcon('download')
    + '<b>' + escHtml(title) + '</b><span class="dl-badge">桌面版专属</span></div>'
    + '<div class="dl-card-b">' + escHtml(what) + '</div>'
    + (how ? '<div class="dl-card-b dl-card-how">' + escHtml(how) + '</div>' : '')
    + '<div class="dl-card-acts">'
    + '<button type="button" class="btn btn-primary btn-sm" onclick="openDownloadPage()">下载桌面版</button>'
    + '<span class="sub">已装桌面版？用 BotCraft.exe 打开本应用即可解锁（同一份文件，双击 exe 启动）</span>'
    + '</div></div>';
}
window.bcIsDesktop = bcIsDesktop;
window.openDownloadPage = openDownloadPage;
window.desktopOnlyCard = desktopOnlyCard;

function openReleasePage() {
  // releases/latest 恒指向最新发布版；桌面壳内 window.open 不可靠，走后端系统浏览器
  var api = window.pywebview && window.pywebview.api;
  if (api && api.bc_open_url) {
    Promise.resolve(api.bc_open_url('https://github.com/F1ee987/BotCraft/releases/latest'))
      .then(function (r) { if (!(r && r.ok)) toast('打开浏览器失败，请手动访问 GitHub Releases', 'err'); },
            function () { toast('打开浏览器失败，请手动访问 GitHub Releases', 'err'); });
  }
}
window.openReleasePage = openReleasePage;
function checkForUpdate() {
  try {
    if (!(window.pywebview && window.pywebview.api)) {           // 仅桌面版
      setUpdateStatus('仅桌面版支持（浏览器直开无更新概念）');
      return;
    }
    if (!/^\d+(\.\d+)*$/.test(String(BC_BUILD_VERSION || ''))) {  // 开发态 / 浏览器直开
      setUpdateStatus('开发构建，未记录版本号，跳过检查');
      return;
    }
    setUpdateStatus('正在检查更新…');
    // 判据是「**有没有新 Release 可下载**」，不是「仓库有没有新提交」。
    //
    // 早前用 compare(本地...main) 判 ahead/behind，那是另一个问题：它问的是提交关系，
    // 而用户想的是「有没有新版 exe 能下」。中间夹着「提交了但没发 Release」的窗口 ——
    // 一次只改 README / 注释 / develop 分支的提交，就会让所有已是最新版的用户
    // 被反复告知「发现新版本」，点进去下载到的还是同一份文件（2026-10-04 用户报「已经是
    // 最新版为什么还能检测到最新版本」的根因）。反过来只比 sha 也会永远误报，因为 exe
    // 打包于 commit 之前、本地指纹天然落后 1~N 个提交。
    //
    // releases/latest 的 tag 由 release_exe.py 从同一个 APP_VERSION 推导，两端同源。
    fetch('https://api.github.com/repos/F1ee987/BotCraft/releases/latest',
      { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.tag_name) { setUpdateStatus('检查失败（网络不通或接口限流），稍后再试'); return; }
        var remote = String(j.tag_name).replace(/^v/i, '');
        if (!/^\d+(\.\d+)*$/.test(remote)) { setUpdateStatus('检查失败（远端版本号无法识别）'); return; }
        var mine = String(BC_BUILD_VERSION);
        var cmp = compareVersion(remote, mine);
        if (cmp > 0) {
          setUpdateStatusHTML('发现新版本 v' + remote + '（当前 v' + mine + '）'
            + '<button type="button" class="btn btn-ghost btn-sm" onclick="openReleasePage()" style="margin-left:8px;white-space:nowrap">打开下载页</button>');
        } else {
          setUpdateStatus('已是最新版本（v' + mine + '）');
        }
      })
      .catch(function () { setUpdateStatus('检查失败（网络不通），稍后再试'); });
  } catch (eU) { }
}
// 逐段比数字的版本比较：a>b 返回正数，a<b 返回负数，相同返回 0。
// 不用字符串比较 —— '2.10' < '2.9' 会把升过一次的版本号判反。
function compareVersion(a, b) {
  var pa = String(a).split('.'), pb = String(b).split('.');
  var n = Math.max(pa.length, pb.length);
  for (var i = 0; i < n; i++) {
    var x = parseInt(pa[i] || '0', 10) || 0, y = parseInt(pb[i] || '0', 10) || 0;
    if (x !== y) return x - y;
  }
  return 0;
}
function manualCheckUpdate() { checkForUpdate(); }
window.manualCheckUpdate = manualCheckUpdate;
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    setUpdateStatus: typeof setUpdateStatus !== "undefined" ? setUpdateStatus : undefined,
    setUpdateStatusHTML: typeof setUpdateStatusHTML !== "undefined" ? setUpdateStatusHTML : undefined,
    openReleasePage: typeof openReleasePage !== "undefined" ? openReleasePage : undefined,
    checkForUpdate: typeof checkForUpdate !== "undefined" ? checkForUpdate : undefined,
    showAnaTab: typeof showAnaTab !== "undefined" ? showAnaTab : undefined,
    manualCheckUpdate: typeof manualCheckUpdate !== "undefined" ? manualCheckUpdate : undefined,
  };
}
