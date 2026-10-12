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
    // 空值守卫：bot 为 null/undefined 时旧写法直接抛 TypeError。
    // searchKBHitsHybrid 比同步版多一层 await，抛错会以 unhandledrejection 的形式
    // 消失得更隐蔽（不弹窗、不报错，界面像卡住）。对合法输入零行为变化。
    if (!bot) return { chunks: [], metas: [], tfs: [], idf: {}, n: 0 };
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
  // ---------- 语义检索：混合检索的第二路（2026-10-12 P0-2） ----------
  // 纯 TF-IDF 只认词项重合：问「怎么退货」检索不到写「七天无理由退换货流程」的文档，
  // 因为两者没有共同词项。这一路用 embedding 抓语义相近的块，与 TF-IDF 融合。
  //
  // 三条硬约束，改动前先读：
  //   1) 可缺失。没配 embedding 就静默退回纯 TF-IDF，结果与加这一路之前完全一致 ——
  //      混合检索是增强，不是前提。任何人没配 Key 都不该看到行为变化。
  //   2) 不落盘。向量体积大（每块几百维），全量进 localStorage 会迅速撑爆
  //      （README 已就 >4MB 告警）。只在内存 LRU 里缓存，刷新即重建。
  //   3) 可扩展。默认只有 API 提供者；桌面版本地量化模型将来打包后，往
  //      KB_EMBED_PROVIDERS 注册一个实现即可，检索内核一行不用改。
  var KB_EMBED_PROVIDERS = {};
  var _kbEmbCache = new Map();          // chunk 文本 → 向量（插入序即新旧序）
  var KB_EMB_CACHE_MAX = 600;           // 条目上限：与 _kbCache 同一套 LRU 写法
  var KB_EMBED_BATCH = 32;              // 单请求最多送多少条，避免请求体过大被端点拒
  var KB_EMBED_MAX_CHUNKS = 500;        // 块数超过此值不启用向量路（首次嵌入会卡太久）
  function kbRegisterEmbedder(name, impl) {
    // impl 需提供 async embed(texts) -> number[][]，条数与入参一一对应
    KB_EMBED_PROVIDERS[name] = impl;
    return name;
  }
  function kbEmbedCfg() {
    try {
      var c = (window.BotCraftAI && window.BotCraftAI.getConfig) ? window.BotCraftAI.getConfig() : null;
      if (!c) return null;
      var base = String(c.embBaseURL || '').trim();
      var model = String(c.embModel || '').trim();
      // 隐式启用：接口与模型都填了才算配好。与 STT「留空则不转写」同构，
      // 不引入新的开关模式，也少一处会与主配置打架的状态。
      if (!base || !model) return null;
      return { base: base.replace(/\/+$/, ''), model: model, key: String(c.embAPIKey || '').trim() };
    } catch (e) { return null; }
  }
  /* 是否真的能走向量路。注意不能写成「注册表非空即可用」—— 默认就注册了一个
     'api' 提供者，那样本函数永远返回 true，用户什么都没配也会进向量路、
     白跑一次注定失败的请求才降级（test_kb.js 首轮跑出来的真 bug）。
     提供者可声明 available()；没有声明的才默认视为可用（本地提供者通常如此）。 */
  function kbEmbedAvailable(bot) {
    if (kbEmbedCfg()) return true;
    var names = Object.keys(KB_EMBED_PROVIDERS);
    for (var i = 0; i < names.length; i++) {
      var p = KB_EMBED_PROVIDERS[names[i]];
      if (p && typeof p.available === 'function') { if (p.available()) return true; }
      else return true;
    }
    return false;
  }
  // 默认提供者：用户自配的 OpenAI 兼容 /embeddings 端点（浏览器与桌面版都能用）。
  kbRegisterEmbedder('api', {
    // 没配接口/模型就是不可用 —— 让 kbEmbedAvailable 能如实回答
    available: function () { return !!kbEmbedCfg(); },
    embed: async function (texts) {
      var c = kbEmbedCfg();
      if (!c) throw new Error('未配置 embedding 接口');
      var headers = { 'Content-Type': 'application/json' };
      if (c.key) headers['Authorization'] = 'Bearer ' + c.key;
      var r = await fetch(c.base + '/embeddings', {
        method: 'POST', headers: headers,
        body: JSON.stringify({ model: c.model, input: texts }),
      });
      if (!r.ok) throw new Error('embedding HTTP ' + r.status);
      var j = await r.json();
      var arr = (j && j.data) || [];
      if (arr.length !== texts.length) throw new Error('embedding 返回条数不符');
      return arr.map(function (x) { return (x && x.embedding) || []; });
    },
  });
  // 取向量（带 LRU + 分批）。任一批失败整体抛错，由调用方降级到纯 TF-IDF。
  async function _kbEmbed(texts) {
    var miss = texts.filter(function (t) { return !_kbEmbCache.has(t); });
    if (!miss.length) return texts.map(function (t) { return _kbEmbCache.get(t) || []; });
    var names = Object.keys(KB_EMBED_PROVIDERS);
    var provider = null, lastErr = null;
    for (var i = 0; i < names.length && !provider; i++) {
      try { await KB_EMBED_PROVIDERS[names[i]].embed(miss.slice(0, 1)); provider = KB_EMBED_PROVIDERS[names[i]]; }
      catch (e) { lastErr = e; }
    }
    if (!provider) throw lastErr || new Error('无可用 embedding 提供者');
    for (var s = 0; s < miss.length; s += KB_EMBED_BATCH) {
      var part = miss.slice(s, s + KB_EMBED_BATCH);
      var got = await provider.embed(part);
      part.forEach(function (t, k) { _kbEmbCache.set(t, got[k] || []); });
    }
    while (_kbEmbCache.size > KB_EMB_CACHE_MAX) _kbEmbCache.delete(_kbEmbCache.keys().next().value);
    return texts.map(function (t) { return _kbEmbCache.get(t) || []; });
  }
  function _vecCos(a, b) {
    if (!a.length || !b.length || a.length !== b.length) return 0;
    var dot = 0;
    for (var i = 0; i < a.length; i++) dot += a[i] * b[i];
    var na = 0, nb = 0;
    for (var j = 0; j < a.length; j++) { na += a[j] * a[j]; nb += b[j] * b[j]; }
    var sa = Math.sqrt(na), sb = Math.sqrt(nb);
    return (sa && sb) ? dot / (sa * sb) : 0;
  }
  // 两路分数各自按最大值归一化到 [0,1] 后加权融合。
  // 不归一化直接加是错的：两路的 cosine 量纲不同（TF-IDF 稀疏高维、向量稠密低维），
  // 数值大那一路会直接吞掉另一路，融合名不副实。
  function _kbFuse(tfidf, vec, wVec) {
    var mt = 0, mv = 0, i;
    for (i = 0; i < tfidf.length; i++) { if (tfidf[i] > mt) mt = tfidf[i]; if (vec[i] > mv) mv = vec[i]; }
    var out = [];
    for (i = 0; i < tfidf.length; i++) {
      out.push((mt ? tfidf[i] / mt : 0) * (1 - wVec) + (mv ? vec[i] / mv : 0) * wVec);
    }
    return out;
  }
  /* 混合检索（async）。与 searchKBHits 同签名同返回形状，内部多走一路向量。
     为什么要新开一个而不是把 searchKBHits 改成 async：
     buildCtxSections 是同步函数，那里的检索只用于「参考来源」展示（注入的其实是
     全文），改成 async 会连带把核心链路拖成异步，风险与收益不匹配。
     真正喂模型的两个调用点（工作流检索节点）已迁到本函数。 */
  async function searchKBHitsHybrid(bot, query, k, opt) {
    k = k || 5;
    var idx = _kbIndexFor(bot);
    if (!idx.n) return [];
    // 第一路：TF-IDF。必须对**全部块**打分，不能复用 searchKBHits 的 score>0 过滤 ——
    // 那个过滤会把「语义相关但词项不重合」的块提前淘汰，向量路就白做了。
    var qt = _tokenize(query), qtf = {}, total = qt.length || 1;
    qt.forEach(function (t) { qtf[t] = (qtf[t] || 0) + 1; });
    var qvTf = {};
    Object.keys(qtf).forEach(function (t) { qvTf[t] = qtf[t] / total * (idx.idf[t] || 0); });
    var tfidf = idx.chunks.map(function (ch, i) { return _cosine(qvTf, idx.tfs[i]); });
    // 没配 embedding，或块数太多（首次嵌入会卡太久）：走与 searchKBHits 相同的路径
    if (!kbEmbedAvailable(bot) || idx.n > KB_EMBED_MAX_CHUNKS) return searchKBHits(bot, query, k);
    try {
      var vecs = await _kbEmbed(idx.chunks.concat([query]));
      var qv = vecs[vecs.length - 1];
      var vs = idx.chunks.map(function (ch, i) { return _vecCos(qv, vecs[i]); });
      var wVec = (opt && typeof opt.wVec === 'number') ? opt.wVec : 0.5;
      var fused = _kbFuse(tfidf, vs, wVec);
      var terms = Object.keys(qtf);
      var out = idx.chunks.map(function (ch, i) {
        var m = (idx.metas && idx.metas[i]) || {};
        return { text: ch, score: fused[i], docId: m.d || '', docName: m.n || '',
                 chunk: (m.i || 0) + 1, terms: terms, _tfidf: tfidf[i], _vec: vs[i] };
      });
      out.sort(function (a, b) { return b.score - a.score; });
      return out.filter(function (h) { return h.score > 0; }).slice(0, k);
    } catch (e) {
      // 降级：向量路挂了不该让检索整体失败
      try { if (window.__bcRecordFault) window.__bcRecordFault('语义检索失败，已降级 TF-IDF', 'kb'); } catch (eF) { }
      return searchKBHits(bot, query, k);
    }
  }
  window.searchKBHits = searchKBHits;
  window.searchKBHitsHybrid = searchKBHitsHybrid;
  window.kbRegisterEmbedder = kbRegisterEmbedder;
  window.kbEmbedAvailable = kbEmbedAvailable;
  window.kbFuseScores = _kbFuse;   // 纯函数，单独导出便于单元测试融合归一化
  window.kbClearHits = kbClearHits;
  window.kbPushHits = kbPushHits;
  window.kbSnapshotHits = kbSnapshotHits;
  window.kbChunkOf = kbChunkOf;
  window.kbInvalidate = kbInvalidate;
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    searchKBHits: typeof searchKBHits !== "undefined" ? searchKBHits : undefined,
    searchKBHitsHybrid: typeof searchKBHitsHybrid !== "undefined" ? searchKBHitsHybrid : undefined,
    kbRegisterEmbedder: typeof kbRegisterEmbedder !== "undefined" ? kbRegisterEmbedder : undefined,
    kbEmbedAvailable: typeof kbEmbedAvailable !== "undefined" ? kbEmbedAvailable : undefined,
    _kbFuse: typeof _kbFuse !== "undefined" ? _kbFuse : undefined,
    kbClearHits: typeof kbClearHits !== "undefined" ? kbClearHits : undefined,
    kbPushHits: typeof kbPushHits !== "undefined" ? kbPushHits : undefined,
    kbSnapshotHits: typeof kbSnapshotHits !== "undefined" ? kbSnapshotHits : undefined,
    kbChunkOf: typeof kbChunkOf !== "undefined" ? kbChunkOf : undefined,
    kbInvalidate: typeof kbInvalidate !== "undefined" ? kbInvalidate : undefined,
  };
}
