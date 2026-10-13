// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/encfile ===== */ 标记的段落。
// P1-3 导出加密：把配置 JSON 用口令加密后再落盘，避免明文 API Key 随导出文件外传
// （见安全审计 P0-1）。算法：PBKDF2-SHA256 派生 256bit 密钥（迭代 210000，OWASP 2023
// 对 PBKDF2-SHA256 的推荐下限）+ AES-GCM 认证加密（一次性 IV）。subtle 作为首个参数注入，
// 桌面版/https 用原生 crypto.subtle，Node 测试注入 webcrypto.subtle；file:// 直开无 subtle
// 时由调用方降级提示（不在这里兜底，避免纯 JS AES-GCM 的维护负担）。
var BC_ENC_MAGIC = 'BCENC1';
function _b64u(buf) {
  var bytes = (buf instanceof Uint8Array) ? buf : new Uint8Array(buf), s = '';
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function _b64uDecode(str) {
  str = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  var bin = atob(str), out = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function _encRandomBytes(n) {
  var a = new Uint8Array(n);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (var i = 0; i < n; i++) a[i] = Math.floor(Math.random() * 256);
  return a;
}
function bcIsEncrypted(obj) { return !!(obj && obj.enc === BC_ENC_MAGIC); }
async function bcEncrypt(subtle, text, pass, opts) {
  opts = opts || {};
  var iter = opts.iterations || 210000;
  var salt = _encRandomBytes(16), iv = _encRandomBytes(12);
  var key = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  var ck = await subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' },
    key, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  var ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: iv }, ck, new TextEncoder().encode(text)));
  return { enc: BC_ENC_MAGIC, kdf: 'PBKDF2', hash: 'SHA-256', cipher: 'AES-GCM',
    iterations: iter, salt: _b64u(salt), iv: _b64u(iv), ct: _b64u(ct) };
}
async function bcDecrypt(subtle, obj, pass) {
  if (!bcIsEncrypted(obj)) return { ok: false, reason: 'fmt' };
  try {
    var salt = _b64uDecode(obj.salt), iv = _b64uDecode(obj.iv);
    var key = await subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    var ck = await subtle.deriveKey(
      { name: 'PBKDF2', salt: salt, iterations: obj.iterations || 210000, hash: 'SHA-256' },
      key, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    var pt = await subtle.decrypt({ name: 'AES-GCM', iv: iv }, ck, _b64uDecode(obj.ct));
    return { ok: true, text: new TextDecoder().decode(pt) };
  } catch (e) { return { ok: false, reason: 'pass' }; }
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    bcEncrypt: typeof bcEncrypt !== "undefined" ? bcEncrypt : undefined,
    bcDecrypt: typeof bcDecrypt !== "undefined" ? bcDecrypt : undefined,
    bcIsEncrypted: typeof bcIsEncrypted !== "undefined" ? bcIsEncrypted : undefined,
  };
}
