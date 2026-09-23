// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/update ===== */ 标记的段落。
var BC_BUILD_COMMIT = '__BC_BUILD_COMMIT__';
function setUpdateStatus(txt) {
  var el = document.getElementById('updateCheckStatus');
  if (el) el.textContent = txt;
}
function checkForUpdate() {
  try {
    if (!(window.pywebview && window.pywebview.api)) {           // 仅桌面版
      setUpdateStatus('仅桌面版支持（浏览器直开无更新概念）');
      return;
    }
    if (!/^[0-9a-f]{7,40}$/i.test(BC_BUILD_COMMIT)) {            // 开发态 / 浏览器直开
      setUpdateStatus('开发构建，未记录版本指纹，跳过检查');
      return;
    }
    setUpdateStatus('正在检查更新…');
    // 用 GitHub compare 接口而不是比对最新 commit sha：exe 打包于 commit 之前，
    // 本地指纹天然落后 1~N 个提交 —— 若只比最新 sha 会永远误报「有新版本」。
    // compare(本地...main)：identical/behind = 仓库没有比本地更新的提交 → 已是最新；
    // ahead = main 领先本地 → 真有新版本；diverged = 分叉 → 建议重新下载。
    fetch('https://api.github.com/repos/F1ee987/BotCraft/compare/' +
        BC_BUILD_COMMIT + '...main',
      { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.status) { setUpdateStatus('检查失败（网络不通或接口限流），稍后再试'); return; }
        if (j.status === 'ahead') setUpdateStatus('发现新版本：请到 GitHub（F1ee987/BotCraft）下载最新 exe');
        else if (j.status === 'diverged') setUpdateStatus('本地版本与仓库分叉，建议重新下载最新 exe');
        else setUpdateStatus('已是最新版本');
      })
      .catch(function () { setUpdateStatus('检查失败（网络不通），稍后再试'); });
  } catch (eU) { }
}
function manualCheckUpdate() { checkForUpdate(); }
window.manualCheckUpdate = manualCheckUpdate;
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    setUpdateStatus: typeof setUpdateStatus !== "undefined" ? setUpdateStatus : undefined,
    checkForUpdate: typeof checkForUpdate !== "undefined" ? checkForUpdate : undefined,
    showAnaTab: typeof showAnaTab !== "undefined" ? showAnaTab : undefined,
    manualCheckUpdate: typeof manualCheckUpdate !== "undefined" ? manualCheckUpdate : undefined,
  };
}
