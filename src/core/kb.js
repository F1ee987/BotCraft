// 由 build_exe/build_export_modules.py 从 BotCraft.html 自动生成，请勿手工编辑。
// 单一真实源是 BotCraft.html 里 /* ===== MODULE: core/kb ===== */ 标记的段落。
// ---------- TF-IDF 知识库检索 ----------
  function _tokenize(text) {
    return (text || '').toLowerCase().match(/[一-龥]|[a-z0-9]+/g) || [];
  }
  function _chunkText(text, size, overlap) {
    size = size || 400; overlap = overlap || 80;
    var paras = (text || '').split(/\n{1,}/).map(function (s) { return s.trim(); }).filter(Boolean);
    var chunks = [], cur = '';
    paras.forEach(function (p) {
      if ((cur + '\n' + p).length <= size) { cur = cur ? cur + '\n' + p : p; }
      else {
        if (cur) { chunks.push(cur); cur = ''; }
        if (p.length > size) { for (var s = 0; s < p.length; s += Math.max(1, size - overlap)) chunks.push(p.slice(s, s + size)); }
        else { cur = p; }
      }
    });
    if (cur) chunks.push(cur);
    return chunks.length ? chunks : [(text || '')];
  }
  function _buildKBIndex(bot) {
    // 逐文档分块并保留来源。旧写法把所有文档 join 成一大段再分块，
    // 来源信息在索引阶段就丢了，导致回答无法标注「参考了哪份文档的哪一段」。
    var metas = [];
    (bot.knowledges || []).forEach(function (id) {
      var r = (typeof kbById === 'function') ? kbById(id) : null;
      if (!r || !r.content) return;
      _chunkText(r.content, 400, 80).forEach(function (ch, ci) {
        metas.push({ t: ch, d: r.id || id, n: r.name || '未命名文档', i: ci });
      });
    });
    if (!metas.length) return { chunks: [], metas: [], tfs: [], idf: {}, n: 0 };
    var chunks = metas.map(function (m) { return m.t; });
    var df = {}, tfs = chunks.map(function (ch) {
      var toks = _tokenize(ch), tf = {}, total = toks.length || 1;
      toks.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      Object.keys(tf).forEach(function (t) { tf[t] = tf[t] / total; if (!df[t]) df[t] = 0; df[t]++; });
      return tf;
    });
    var n = chunks.length, idf = {};
    Object.keys(df).forEach(function (t) { idf[t] = Math.log((1 + n) / (1 + df[t])) + 1; });
    return { chunks: chunks, metas: metas, tfs: tfs, idf: idf, n: n };
  }
  // 检索索引缓存（第 3 批性能优化 #22）。
// key 里含每份知识库的 updatedAt，改一次文档就是一个新 key —— 而每个索引都持有
// chunks（全部块正文副本）+ tfs（每块完整词频表）。没有上限时「改 20 次文档」
// 就有 20 份完整索引同时驻留。同一个代码库里 ctxCacheOf 已有 CTX_CACHE_MAX=24，
// 两套缓存策略不一致；这里照同一套写法加上限（LRU：命中即移到最新）。
var _kbCache = new Map();   // 插入序即新旧序（Map 迭代按插入序），不再需要配套的顺序数组
var KB_CACHE_MAX = 12;
  // 索引条数上限：比 ctx 缓存（CTX_CACHE_MAX=24）小，单条索引大得多（全文 + 词频表）
function _kbCachePut(key, idx) {
  if (_kbCache.has(key)) _kbCache.delete(key);   // 重复 put 也提到最新
  _kbCache.set(key, idx);
  while (_kbCache.size > KB_CACHE_MAX) _kbCache.delete(_kbCache.keys().next().value);  // 首个即最旧
}
function _kbIndexFor(bot) {
    var key = (bot.id || 'x') + '|' + (bot.knowledges || []).map(function (id) {
      var r = (typeof kbById === 'function') ? kbById(id) : null; return r ? (r.updatedAt || r.name) : '';
    }).join(',');
    if (_kbCache.has(key)) {
      // 命中即提到最新（LRU）：删掉重 set，插入序就是新旧序
      var v = _kbCache.get(key);
      _kbCache.delete(key); _kbCache.set(key, v);
      return v;
    }
    var idx = _buildKBIndex(bot); _kbCachePut(key, idx); return idx;
  }
  function _cosine(a, b) {
    var dot = 0, na = 0, nb = 0;
    Object.keys(a).forEach(function (t) { na += a[t] * a[t]; if (b[t]) dot += a[t] * b[t]; });
    Object.keys(b).forEach(function (t) { nb += b[t] * b[t]; });
    if (!na || !nb) return 0; return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
  function searchKBHits(bot, query, k) {
    k = k || 5;
    var idx = _kbIndexFor(bot);
    if (!idx.n) return [];
    var qt = _tokenize(query), qtf = {}, total = qt.length || 1;
    qt.forEach(function (t) { qtf[t] = (qtf[t] || 0) + 1; });
    var qv = {}; Object.keys(qtf).forEach(function (t) { qv[t] = qtf[t] / total * (idx.idf[t] || 0); });
    var scored = idx.chunks.map(function (ch, i) { return { ch: ch, i: i, score: _cosine(qv, idx.tfs[i]) }; });
    scored.sort(function (a, b) { return b.score - a.score; });
    var terms = Object.keys(qtf);
    return scored.filter(function (s) { return s.score > 0; }).slice(0, k).map(function (s) {
      var m = (idx.metas && idx.metas[s.i]) || {};
      return { text: s.ch, score: s.score, docId: m.d || '', docName: m.n || '', chunk: (m.i || 0) + 1, terms: terms };
    });
  }
  // 保持旧签名（只返回片段文本），工作流注入沿用；新增的结构化版本见 searchKBHits
  function searchKB(bot, query, k) {
    return searchKBHits(bot, query, k).map(function (h) { return h.text; });
  }

  // ---------- 引用来源记录（供回答下方标注「参考了哪份文档的哪一段」） ----------
  // 每次生成前清空，生成中累积，生成结束由调用方取快照挂到该条消息上。
  var _kbHitsBuf = null;
  function kbClearHits() { _kbHitsBuf = []; }
  function kbPushHits(hits) {
    if (!_kbHitsBuf) _kbHitsBuf = [];
    (hits || []).forEach(function (h) {
      if (!h || !h.text) return;
      var dup = _kbHitsBuf.some(function (x) { return x.docId === h.docId && x.chunk === h.chunk; });
      if (!dup) _kbHitsBuf.push(h);
    });
    _kbHitsBuf.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    if (_kbHitsBuf.length > 8) _kbHitsBuf = _kbHitsBuf.slice(0, 8);
  }
  // 落盘只存「来源指针 + 摘要」，正文按需从 ALL_KB 实时取，避免每条消息再存一份全文
  function kbSnapshotHits() {
    return (_kbHitsBuf || []).slice(0, 5).map(function (h) {
      return {
        d: h.docId, n: h.docName, i: h.chunk,
        s: Math.round((h.score || 0) * 1000) / 1000,
        x: String(h.text || '').replace(/\s+/g, ' ').slice(0, 40)
      };
    });
  }
  // 按「文档 id + 片段序号」取回原文；文档被改写后序号可能错位，取不到由调用方降级
  function kbChunkOf(docId, chunkNo) {
    var k = (typeof kbById === 'function') ? kbById(docId) : null;
    if (!k || !k.content) return '';
    var chs = _chunkText(k.content, 400, 80);
    return chs[chunkNo - 1] || '';
  }
  // 文档改动后必须让检索索引与缓存失效，否则改完内容仍按旧索引回答
  function kbInvalidate(docId) {
    _kbCache = new Map();    // 整体换新实例，条目与顺序一并作废
    return docId;
  }
  window.searchKBHits = searchKBHits;
  window.kbClearHits = kbClearHits;
  window.kbPushHits = kbPushHits;
  window.kbSnapshotHits = kbSnapshotHits;
  window.kbChunkOf = kbChunkOf;
  window.kbInvalidate = kbInvalidate;
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    searchKBHits: typeof searchKBHits !== "undefined" ? searchKBHits : undefined,
    kbClearHits: typeof kbClearHits !== "undefined" ? kbClearHits : undefined,
    kbPushHits: typeof kbPushHits !== "undefined" ? kbPushHits : undefined,
    kbSnapshotHits: typeof kbSnapshotHits !== "undefined" ? kbSnapshotHits : undefined,
    kbChunkOf: typeof kbChunkOf !== "undefined" ? kbChunkOf : undefined,
    kbInvalidate: typeof kbInvalidate !== "undefined" ? kbInvalidate : undefined,
  };
}
